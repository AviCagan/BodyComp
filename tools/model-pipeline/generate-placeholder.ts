/**
 * Phase 0 ONLY: writes a stylized primitives body that satisfies the asset contract
 * (§6.2) so the rendering spike can load, color, and pick every region on a real device.
 * This is the one place the brief allows a placeholder body. Phase 1 replaces both
 * files with the Z-Anatomy-derived models from tools/model-pipeline/build.py.
 *
 * Usage: npx tsx tools/model-pipeline/generate-placeholder.ts [outDir=assets/models]
 *
 * Contract recap: glTF 2.0 binary; one mesh per region named exactly by region id,
 * plus body_base; left and right joined into the one region mesh; neutral gray
 * materials; Y-up; front faces +Z (glTF convention); stature exactly 1.0 with feet
 * at y = 0; midline at x = z = 0; no textures; model.manifest.json beside it.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { BODY_BASE_MESH, REGION_IDS, type RegionId } from '../../src/engine/taxonomy';
import {
  applyWidthProfile,
  capsule,
  merge,
  mirrorX,
  place,
  triangleCount,
  unitSphere,
  type MeshData,
  type Placement,
} from './geometry';

type Shape = { kind: 'sphere' | 'capsule'; r?: number; len?: number } & Placement & { mirror?: boolean };

const SPHERE = unitSphere(20, 12);
const cap = (r: number, len: number) => capsule(r, len, 20, 5);

function build(shape: Shape): MeshData {
  const base = shape.kind === 'sphere' ? SPHERE : cap(shape.r ?? 0.03, shape.len ?? 0.1);
  const one = place(base, { at: shape.at, scale: shape.scale, rotate: shape.rotate });
  return shape.mirror ? merge([one, mirrorX(one)]) : one;
}

// Landmark heights as fractions of stature (brief §6.3): shoulders .82, chest .72,
// waist .61, hips .52, knees .28, ankles .04. Front is +Z.
const S = (at: [number, number, number], scale: [number, number, number], extra: Partial<Shape> = {}): Shape => ({
  kind: 'sphere',
  at,
  scale,
  mirror: true,
  ...extra,
});
const C = (at: [number, number, number], r: number, len: number, extra: Partial<Shape> = {}): Shape => ({
  kind: 'capsule',
  at,
  r,
  len,
  mirror: true,
  ...extra,
});

const REGIONS: Record<RegionId, Shape[]> = {
  chest_upper: [S([0.072, 0.785, 0.062], [0.07, 0.024, 0.03])],
  chest_mid: [S([0.078, 0.748, 0.068], [0.076, 0.03, 0.036])],
  chest_lower: [S([0.066, 0.712, 0.058], [0.064, 0.02, 0.03])],
  delt_front: [S([0.148, 0.805, 0.04], [0.036, 0.04, 0.032])],
  delt_side: [S([0.172, 0.8, 0.0], [0.038, 0.048, 0.04])],
  delt_rear: [S([0.148, 0.805, -0.04], [0.036, 0.04, 0.032])],
  lats: [S([0.1, 0.675, -0.05], [0.052, 0.085, 0.03], { rotate: [0, 0, 12] })],
  traps_mid_lower: [S([0.0, 0.74, -0.07], [0.06, 0.095, 0.02], { mirror: false })],
  rhomboids: [S([0.05, 0.775, -0.065], [0.035, 0.04, 0.02])],
  traps_upper: [S([0.07, 0.862, -0.03], [0.07, 0.03, 0.032], { rotate: [0, 0, -18] })],
  erectors: [S([0.026, 0.615, -0.07], [0.02, 0.125, 0.024])],
  biceps: [C([0.188, 0.72, 0.024], 0.028, 0.1)],
  brachialis: [C([0.204, 0.675, 0.004], 0.019, 0.05)],
  triceps_long: [C([0.18, 0.72, -0.03], 0.025, 0.1)],
  triceps_lateral_medial: [C([0.207, 0.7, -0.02], 0.02, 0.09)],
  forearm_flexors: [C([0.202, 0.54, 0.016], 0.022, 0.12, { rotate: [0, 0, -4] })],
  forearm_extensors_brachioradialis: [C([0.212, 0.54, -0.016], 0.02, 0.12, { rotate: [0, 0, -4] })],
  abs: [S([0.0, 0.63, 0.055], [0.05, 0.09, 0.025], { mirror: false })],
  obliques: [S([0.088, 0.63, 0.02], [0.026, 0.08, 0.042])],
  glute_max: [S([0.075, 0.515, -0.075], [0.072, 0.062, 0.046])],
  glute_med: [S([0.11, 0.57, -0.03], [0.036, 0.04, 0.042])],
  quads_rf: [C([0.075, 0.41, 0.064], 0.028, 0.18)],
  quads_vasti: [C([0.075, 0.4, 0.03], 0.05, 0.2)],
  hamstrings_hip_ext: [C([0.075, 0.41, -0.052], 0.04, 0.18)],
  hamstrings_bf_short: [C([0.1, 0.34, -0.042], 0.02, 0.08)],
  adductors: [C([0.036, 0.42, 0.01], 0.03, 0.16)],
  gastrocnemius: [C([0.075, 0.2, -0.042], 0.035, 0.1)],
  soleus: [C([0.075, 0.13, -0.03], 0.03, 0.1)],
  tibialis: [C([0.07, 0.16, 0.036], 0.02, 0.14)],
  neck_flexors: [C([0.0, 0.885, 0.02], 0.025, 0.05, { mirror: false })],
  neck_extensors: [C([0.0, 0.885, -0.02], 0.03, 0.05, { mirror: false })],
  hip_flexors: [S([0.05, 0.53, 0.05], [0.03, 0.05, 0.02])],
};

const BODY_BASE: Shape[] = [
  { kind: 'sphere', at: [0, 0.94, 0], scale: [0.058, 0.065, 0.062] }, // head
  { kind: 'sphere', at: [0, 0.7, 0], scale: [0.11, 0.15, 0.058] }, // torso core
  { kind: 'sphere', at: [0, 0.525, 0], scale: [0.12, 0.05, 0.07] }, // pelvis
  S([0.215, 0.43, 0.0], [0.024, 0.045, 0.014]), // hands
  S([0.075, 0.02, 0.05], [0.04, 0.02, 0.09]), // feet
  S([0.075, 0.285, 0.0], [0.045, 0.045, 0.045]), // knees
  S([0.196, 0.632, -0.005], [0.03, 0.03, 0.03]), // elbows
  S([0.075, 0.05, -0.01], [0.03, 0.03, 0.03]), // ankles
];

const FEMALE_PROFILE = [
  { y: 0.04, s: 0.96 },
  { y: 0.28, s: 0.98 },
  { y: 0.52, s: 1.08 },
  { y: 0.61, s: 0.95 },
  { y: 0.72, s: 0.92 },
  { y: 0.82, s: 0.88 },
  { y: 1.0, s: 0.92 },
];

function buildBody(body: 'female' | 'male') {
  const meshes = new Map<string, MeshData>();
  for (const id of REGION_IDS) meshes.set(id, merge(REGIONS[id].map(build)));
  const baseParts = BODY_BASE.map(build);
  if (body === 'female') {
    // Non-tracked mammary tissue over the mid/lower pec (§6.3 step 6), part of body_base.
    baseParts.push(build(S([0.062, 0.735, 0.085], [0.05, 0.04, 0.035])));
  }
  meshes.set(BODY_BASE_MESH, merge(baseParts));
  if (body === 'female') {
    for (const [id, m] of meshes) meshes.set(id, applyWidthProfile(m, FEMALE_PROFILE));
  }
  return meshes;
}

function normalizeStature(meshes: Map<string, MeshData>) {
  let minY = Infinity,
    maxY = -Infinity;
  for (const m of meshes.values())
    for (let i = 1; i < m.positions.length; i += 3) {
      minY = Math.min(minY, m.positions[i]!);
      maxY = Math.max(maxY, m.positions[i]!);
    }
  const k = 1 / (maxY - minY);
  for (const m of meshes.values())
    for (let i = 0; i < m.positions.length; i += 3) {
      m.positions[i] = m.positions[i]! * k;
      m.positions[i + 1] = (m.positions[i + 1]! - minY) * k;
      m.positions[i + 2] = m.positions[i + 2]! * k;
    }
}

async function writeBody(body: 'female' | 'male', outDir: string) {
  const meshes = buildBody(body);
  normalizeStature(meshes);

  const doc = new Document();
  doc.createBuffer('body');
  const scene = doc.createScene('body');
  const material = doc
    .createMaterial('neutral')
    .setBaseColorFactor([0.7, 0.7, 0.7, 1])
    .setMetallicFactor(0)
    .setRoughnessFactor(0.85);
  const manifestRegions: { id: string; triangles: number }[] = [];
  let total = 0;
  const order = [...REGION_IDS, BODY_BASE_MESH];
  for (const id of order) {
    const m = meshes.get(id)!;
    const useU32 = m.positions.length / 3 > 65535;
    const position = doc.createAccessor(`${id}_pos`).setType('VEC3').setArray(new Float32Array(m.positions));
    const normal = doc.createAccessor(`${id}_nrm`).setType('VEC3').setArray(new Float32Array(m.normals));
    const indices = doc
      .createAccessor(`${id}_idx`)
      .setType('SCALAR')
      .setArray(useU32 ? new Uint32Array(m.indices) : new Uint16Array(m.indices));
    const prim = doc
      .createPrimitive()
      .setAttribute('POSITION', position)
      .setAttribute('NORMAL', normal)
      .setIndices(indices)
      .setMaterial(material);
    const mesh = doc.createMesh(id).addPrimitive(prim);
    const node = doc.createNode(id).setMesh(mesh);
    scene.addChild(node);
    const tris = triangleCount(m);
    total += tris;
    if (id !== BODY_BASE_MESH) manifestRegions.push({ id, triangles: tris });
  }
  doc.getRoot().getAsset().generator = 'showup tools/model-pipeline/generate-placeholder.ts';

  const io = new NodeIO();
  const glb = await io.writeBinary(doc);
  const file = join(outDir, `body-${body}.glb`);
  writeFileSync(file, glb);
  const manifest = {
    contractVersion: 1,
    body,
    kind: 'placeholder-primitives',
    note: 'Phase 0 spike asset. Replaced by the Z-Anatomy-derived model in Phase 1.',
    forward: '+z',
    stature: 1,
    regions: manifestRegions,
    bodyBaseTriangles: triangleCount(meshes.get(BODY_BASE_MESH)!),
    totalTriangles: total,
    bytes: glb.byteLength,
    source: 'generated',
    sourceRevision: 'phase-0',
    license: 'CC0-1.0 (generated primitives)',
  };
  writeFileSync(join(outDir, `body-${body}.manifest.json`), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`${file}: ${total} triangles, ${(glb.byteLength / 1024).toFixed(1)} KiB, ${order.length} meshes`);
}

async function main() {
  const outDir = resolve(process.argv[2] ?? 'assets/models');
  mkdirSync(outDir, { recursive: true });
  await writeBody('female', outDir);
  await writeBody('male', outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
