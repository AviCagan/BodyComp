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
  root: THREE.Group;
  meshes: Map<RegionId | typeof BODY_BASE_MESH, THREE.Mesh>;
}

// Static imports so Metro bundles both bodies; only the selected one is parsed.
const MODULES: Record<BodyModel, number> = { female: femaleGlb, male: maleGlb };

const cache = new Map<BodyModel, Promise<LoadedBody>>();

/**
 * Loads a bundled body GLB. Reads the bytes through expo-asset + expo-file-system and
 * hands them to GLTFLoader.parse — `fetch(file://)` is not reliable on Android and
 * this path does not depend on fiber's loader polyfills (docs/DECISIONS.md, ADR-0005).
 */
export function loadBody(body: BodyModel): Promise<LoadedBody> {
  let p = cache.get(body);
  if (!p) {
    p = doLoad(body).catch((e) => {
      cache.delete(body);
      throw e;
    });
    cache.set(body, p);
  }
  return p;
}

/** Warm the cache while the app boots (§6.2: cold load < 1.5 s). */
export function preloadBodies(): void {
  for (const body of ['female', 'male'] as const) void loadBody(body).catch(() => undefined);
}

async function doLoad(body: BodyModel): Promise<LoadedBody> {
  const asset = await Asset.fromModule(MODULES[body]).downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const buffer = await new File(uri).arrayBuffer();
  const gltf = await new Promise<GLTF>((resolve, reject) => {
    new GLTFLoader().parse(buffer, '', resolve, (err) => reject(err instanceof Error ? err : new Error(String(err))));
  });
  const root = gltf.scene;
  const meshes = new Map<RegionId | typeof BODY_BASE_MESH, THREE.Mesh>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (isRegionId(mesh.name) || mesh.name === BODY_BASE_MESH) meshes.set(mesh.name as RegionId, mesh);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
  });
  const missing = REGION_IDS.filter((r) => !meshes.has(r));
  if (missing.length || !meshes.has(BODY_BASE_MESH)) {
    throw new Error(
      `body-${body}.glb does not satisfy the asset contract; missing: ${[...missing, ...(meshes.has(BODY_BASE_MESH) ? [] : [BODY_BASE_MESH])].join(', ')}`,
    );
  }
  return { body, root, meshes };
}
