/**
 * Asset-contract validator (§6.2, §6.3 step 8). Runs in CI for both bodies.
 *
 *   npx tsx tools/model-pipeline/validate.ts [assets/models]
 *
 * Fails (exit 1) if either body drifts from the contract:
 *  - every id in REGION_IDS exists exactly once as a mesh node, plus body_base
 *  - no unmapped mesh nodes; one primitive per mesh; TRIANGLES mode; indexed; identity transforms
 *  - finite data, no degenerate faces, outward winding (face normals agree with vertex normals)
 *  - no textures, no TEXCOORDs, one material
 *  - total triangles ≤ MODEL_BUDGET.maxTriangles; file ≤ MODEL_BUDGET.maxBytes
 *  - stature normalized: min y ≈ 0, max y ≈ 1; midline centered (|x|,|z| centers small)
 *  - both bodies expose the identical region set; manifest matches the file
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { NodeIO, type Document, type Node } from '@gltf-transform/core';
import { MODEL_BUDGET } from '../../src/config';
import { BODY_BASE_MESH, REGION_IDS } from '../../src/engine/taxonomy';

type Problem = string;

interface Report {
  body: string;
  bytes: number;
  triangles: number;
  meshNames: string[];
  trianglesByMesh: Record<string, number>;
  bounds: { min: [number, number, number]; max: [number, number, number] };
  problems: Problem[];
}

/** Geometry sanity for one primitive: finite data, indexed, no degenerate faces, outward winding. */
function checkGeometry(
  name: string,
  positions: ArrayLike<number>,
  normals: ArrayLike<number> | null,
  indices: ArrayLike<number> | null,
  problems: Problem[],
): number {
  for (let i = 0; i < positions.length; i++)
    if (!Number.isFinite(positions[i])) {
      problems.push(`${name}: non-finite position data`);
      break;
    }
  if (normals)
    for (let i = 0; i < normals.length; i++)
      if (!Number.isFinite(normals[i]!)) {
        problems.push(`${name}: non-finite normal data`);
        break;
      }
  if (!indices) {
    problems.push(`${name}: primitive must be indexed`);
    return positions.length / 9;
  }
  let degenerate = 0;
  let flipped = 0;
  const triCount = indices.length / 3;
  for (let t = 0; t < triCount; t++) {
    const ia = indices[t * 3]! * 3,
      ib = indices[t * 3 + 1]! * 3,
      ic = indices[t * 3 + 2]! * 3;
    const ax = positions[ia]!,
      ay = positions[ia + 1]!,
      az = positions[ia + 2]!;
    const ux = positions[ib]! - ax,
      uy = positions[ib + 1]! - ay,
      uz = positions[ib + 2]! - az;
    const vx = positions[ic]! - ax,
      vy = positions[ic + 1]! - ay,
      vz = positions[ic + 2]! - az;
    const nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-12) {
      degenerate++;
      continue;
    }
    if (normals) {
      const sx = normals[ia]! + normals[ib]! + normals[ic]!;
      const sy = normals[ia + 1]! + normals[ib + 1]! + normals[ic + 1]!;
      const sz = normals[ia + 2]! + normals[ib + 2]! + normals[ic + 2]!;
      if (nx * sx + ny * sy + nz * sz < 0) flipped++;
    }
  }
  const real = triCount - degenerate;
  if (degenerate > 0) problems.push(`${name}: ${degenerate} degenerate (zero-area) triangles`);
  if (real > 0 && flipped / real > 0.01)
    problems.push(`${name}: ${flipped}/${real} triangles wound against their vertex normals (inside-out)`);
  return triCount;
}

function inspect(doc: Document, body: string, bytes: number): Report {
  const problems: Problem[] = [];
  const root = doc.getRoot();
  const scenes = root.listScenes();
  if (scenes.length !== 1) problems.push(`expected 1 scene, found ${scenes.length}`);
  const meshNodes: Node[] = [];
  for (const scene of scenes)
    scene.traverse((n) => {
      if (n.getMesh()) meshNodes.push(n);
    });

  const names = meshNodes.map((n) => n.getName());
  const trianglesByMesh: Record<string, number> = {};
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  let triangles = 0;
  for (const node of meshNodes) {
    const mesh = node.getMesh()!;
    const prims = mesh.listPrimitives();
    if (prims.length !== 1) problems.push(`${node.getName()}: expected 1 primitive, found ${prims.length}`);
    const t = node.getWorldTranslation();
    const s = node.getWorldScale();
    const r = node.getWorldRotation();
    if (
      Math.hypot(...t) > 1e-6 ||
      Math.abs(s[0] - 1) + Math.abs(s[1] - 1) + Math.abs(s[2] - 1) > 1e-6 ||
      Math.abs(r[3] - 1) > 1e-6
    ) {
      problems.push(`${node.getName()}: node transform must be identity (bake transforms)`);
    }
    for (const prim of prims) {
      if (prim.getMode() !== 4) problems.push(`${node.getName()}: primitive mode must be TRIANGLES`);
      const idx = prim.getIndices();
      const pos = prim.getAttribute('POSITION');
      if (!pos) {
        problems.push(`${node.getName()}: missing POSITION`);
        continue;
      }
      if (!prim.getAttribute('NORMAL')) problems.push(`${node.getName()}: missing NORMAL`);
      if (prim.listAttributes().some((_a, i) => prim.listSemantics()[i]?.startsWith('TEXCOORD')))
        problems.push(`${node.getName()}: TEXCOORD attributes are not allowed (no textures)`);
      const tris = checkGeometry(
        node.getName(),
        pos.getArray()!,
        prim.getAttribute('NORMAL')?.getArray() ?? null,
        idx?.getArray() ?? null,
        problems,
      );
      trianglesByMesh[node.getName()] = (trianglesByMesh[node.getName()] ?? 0) + tris;
      triangles += tris;
      const pmin = pos.getMin([0, 0, 0]);
      const pmax = pos.getMax([0, 0, 0]);
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i]!, pmin[i]!);
        max[i] = Math.max(max[i]!, pmax[i]!);
      }
    }
  }

  if (root.listTextures().length > 0)
    problems.push(`${root.listTextures().length} texture(s) present; the contract forbids textures`);
  if (root.listMaterials().length > 1)
    problems.push(`${root.listMaterials().length} materials; expected one neutral material`);

  const expected = new Set<string>([...REGION_IDS, BODY_BASE_MESH]);
  const seen = new Map<string, number>();
  for (const n of names) seen.set(n, (seen.get(n) ?? 0) + 1);
  for (const id of expected) {
    const c = seen.get(id) ?? 0;
    if (c === 0) problems.push(`missing mesh: ${id}`);
    if (c > 1) problems.push(`duplicate mesh: ${id} ×${c}`);
  }
  for (const n of seen.keys()) if (!expected.has(n)) problems.push(`unmapped mesh: ${n}`);

  if (triangles > MODEL_BUDGET.maxTriangles)
    problems.push(`triangles ${triangles} > budget ${MODEL_BUDGET.maxTriangles}`);
  if (bytes > MODEL_BUDGET.maxBytes) problems.push(`file ${bytes} bytes > budget ${MODEL_BUDGET.maxBytes}`);
  if (Math.abs(min[1]) > 0.01) problems.push(`feet not at y=0 (min y = ${min[1].toFixed(4)})`);
  if (Math.abs(max[1] - 1) > 0.01) problems.push(`stature not 1.0 (max y = ${max[1].toFixed(4)})`);
  const cx = (min[0] + max[0]) / 2;
  const cz = (min[2] + max[2]) / 2;
  if (Math.abs(cx) > 0.05 || Math.abs(cz) > 0.1)
    problems.push(`not centered on the midline (center x=${cx.toFixed(3)}, z=${cz.toFixed(3)})`);
  if (max[0] - min[0] > 1 || max[2] - min[2] > 1) problems.push('bounding box wider than tall — is the model Y-up?');
  if (!(max[0] - min[0] > 0.15)) problems.push('bounding box implausibly narrow');

  return { body, bytes, triangles, meshNames: names, trianglesByMesh, bounds: { min, max }, problems };
}

async function main() {
  const dir = resolve(process.argv[2] ?? 'assets/models');
  const io = new NodeIO();
  const reports: Report[] = [];
  for (const body of ['female', 'male'] as const) {
    const file = join(dir, `body-${body}.glb`);
    if (!existsSync(file)) {
      reports.push({
        body,
        bytes: 0,
        triangles: 0,
        meshNames: [],
        trianglesByMesh: {},
        bounds: { min: [0, 0, 0], max: [0, 0, 0] },
        problems: [`missing file ${file}`],
      });
      continue;
    }
    const bytes = statSync(file).size;
    const doc = await io.read(file);
    const report = inspect(doc, body, bytes);
    const manifestPath = join(dir, `body-${body}.manifest.json`);
    if (!existsSync(manifestPath)) report.problems.push(`missing manifest ${manifestPath}`);
    else {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
        totalTriangles?: number;
        regions?: { id: string }[];
        forward?: string;
      };
      if (manifest.totalTriangles !== report.triangles)
        report.problems.push(`manifest totalTriangles ${manifest.totalTriangles} ≠ ${report.triangles}`);
      const ids = new Set((manifest.regions ?? []).map((r) => r.id));
      for (const id of REGION_IDS) if (!ids.has(id)) report.problems.push(`manifest missing region ${id}`);
      if (manifest.forward !== '+z') report.problems.push(`manifest forward must be "+z" (got ${manifest.forward})`);
    }
    reports.push(report);
  }
  const [a, b] = reports;
  if (a && b) {
    const sa = [...a.meshNames].sort().join(',');
    const sb = [...b.meshNames].sort().join(',');
    if (sa !== sb) {
      a.problems.push('region set differs between bodies');
      b.problems.push('region set differs between bodies');
    }
  }
  let failed = false;
  for (const r of reports) {
    const status = r.problems.length ? 'FAIL' : 'ok';
    console.log(
      `[${status}] body-${r.body}.glb  meshes=${r.meshNames.length}  triangles=${r.triangles}  bytes=${r.bytes}  y=[${r.bounds.min[1].toFixed(3)}, ${r.bounds.max[1].toFixed(3)}]`,
    );
    for (const p of r.problems) {
      console.log(`   - ${p}`);
      failed = true;
    }
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
