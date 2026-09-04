import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three-stdlib';
import femaleGlb from '../../../assets/models/body-female.glb';
import maleGlb from '../../../assets/models/body-male.glb';
import { BODY_BASE_MESH, isRegionId, REGION_IDS, type RegionId } from '@/engine/taxonomy';
import type { BodyModel } from './types';

export interface LoadedBody {
  body: BodyModel;
  /** This mount's own scene graph (geometry shared with the cached template). */
  root: THREE.Group;
  meshes: Map<RegionId | typeof BODY_BASE_MESH, THREE.Mesh>;
  /** Region meshes only (no body_base) — what taps raycast against. */
  pickables: THREE.Mesh[];
}

// Static imports so Metro bundles both bodies; only the selected one is parsed.
const MODULES: Record<BodyModel, number> = { female: femaleGlb, male: maleGlb };

const templates = new Map<BodyModel, Promise<THREE.Group>>();

/**
 * Loads a bundled body GLB. Reads the bytes through expo-asset + expo-file-system and
 * hands them to GLTFLoader.parse — `fetch(file://)` is not reliable on Android and
 * this path does not depend on fiber's loader polyfills (docs/DECISIONS.md, ADR-0005).
 * The parsed scene is cached as a template; every caller gets its own clone (geometry is
 * shared, mesh objects and materials are not) so two mounted maps never steal each other's graph.
 */
export async function loadBody(body: BodyModel): Promise<LoadedBody> {
  let p = templates.get(body);
  if (!p) {
    p = doLoad(body).catch((e: unknown) => {
      templates.delete(body);
      throw e;
    });
    templates.set(body, p);
  }
  return instantiate(body, await p);
}

function instantiate(body: BodyModel, template: THREE.Group): LoadedBody {
  const root = template.clone(true);
  const meshes = new Map<RegionId | typeof BODY_BASE_MESH, THREE.Mesh>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && (isRegionId(mesh.name) || mesh.name === BODY_BASE_MESH)) meshes.set(mesh.name as RegionId, mesh);
  });
  const pickables = REGION_IDS.map((r) => meshes.get(r)!);
  return { body, root, meshes, pickables };
}

/** Warm the cache while the app boots (§6.2: cold load < 1.5 s). */
export function preloadBodies(): void {
  for (const body of ['female', 'male'] as const) {
    if (!templates.has(body)) void loadBody(body).catch(() => undefined);
  }
}

async function doLoad(body: BodyModel): Promise<THREE.Group> {
  const asset = await Asset.fromModule(MODULES[body]).downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const buffer = await new File(uri).arrayBuffer();
  const gltf = await new Promise<GLTF>((resolve, reject) => {
    new GLTFLoader().parse(buffer, '', resolve, (err) => reject(err instanceof Error ? err : new Error(String(err))));
  });
  const root = gltf.scene;
  const found = new Set<string>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (isRegionId(mesh.name) || mesh.name === BODY_BASE_MESH) found.add(mesh.name);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
  });
  const missing = [...REGION_IDS, BODY_BASE_MESH].filter((r) => !found.has(r));
  if (missing.length)
    throw new Error(`body-${body}.glb does not satisfy the asset contract; missing: ${missing.join(', ')}`);
  return root;
}
