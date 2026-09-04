import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
import { BODY_BASE_MESH, REGION_IDS, type RegionId } from '@/engine/taxonomy';
import { ANIMATION, CAMERA } from './constants';
import type { RegionPaint } from './colors';
import type { RigState } from './gestures';
import type { LoadedBody } from './load-body';
import { createMatcapTexture } from './matcap';

export interface BodySceneProps {
  loaded: LoadedBody;
  /** Mirrored camera rig; mutated on the JS thread by the gesture bridge. */
  rigRef: React.RefObject<RigState>;
  /** Target paint per region; recomputed by the parent when inputs change. */
  paintRef: React.RefObject<Record<RegionId, RegionPaint>>;
  /** Bumped by the parent whenever paint targets changed (starts a 400 ms lerp). */
  paintVersion: number;
  /** Region whose selection pulse should run (null = none). */
  pulseRegions: readonly RegionId[];
  neutralHex: string;
  backgroundHex: string;
  onFirstFrame: () => void;
}

interface RegionMaterialState {
  material: THREE.MeshMatcapMaterial;
  from: THREE.Color;
  fromOpacity: number;
}

const scratchTarget = new THREE.Vector3();
const scratchPos = new THREE.Vector3();

function snapshotFrom(map: Map<RegionId, RegionMaterialState>): void {
  for (const s of map.values()) {
    s.from.copy(s.material.color);
    s.fromOpacity = s.material.opacity;
  }
}

function applyLerp(map: Map<RegionId, RegionMaterialState>, paint: Record<RegionId, RegionPaint>, t: number): void {
  for (const [region, s] of map) {
    const target = paint[region];
    s.material.color.lerpColors(s.from, target.color, t);
    const opacity = s.fromOpacity + (target.opacity - s.fromOpacity) * t;
    s.material.opacity = opacity;
    s.material.transparent = opacity < 0.999;
  }
}

/**
 * Lives inside the Canvas. Builds the material set ONCE per loaded body and afterwards
 * only mutates material colors and the camera (§7: never re-mount meshes). Runs under
 * frameloop="demand": it calls invalidate only while a color lerp or pulse is live.
 */
export function BodyScene({
  loaded,
  rigRef,
  paintRef,
  paintVersion,
  pulseRegions,
  neutralHex,
  backgroundHex,
  onFirstFrame,
}: BodySceneProps) {
  const { camera, gl, invalidate } = useThree();
  const matcap = useMemo(() => createMatcapTexture(), []);
  const materials = useRef(new Map<RegionId, RegionMaterialState>());
  const lerpStart = useRef(-1);
  const pulseStart = useRef(-1);
  const firstFrameDone = useRef(false);

  // Build materials once per body.
  useEffect(() => {
    const map = materials.current;
    map.clear();
    for (const region of REGION_IDS) {
      const mesh = loaded.meshes.get(region)!;
      const p = paintRef.current![region];
      const material = new THREE.MeshMatcapMaterial({
        matcap,
        color: p.color.clone(),
        opacity: p.opacity,
        transparent: p.opacity < 0.999,
        toneMapped: false,
      });
      mesh.material = material;
      map.set(region, { material, from: material.color.clone(), fromOpacity: p.opacity });
    }
    const base = loaded.meshes.get(BODY_BASE_MESH)!;
    base.material = new THREE.MeshMatcapMaterial({ matcap, color: new THREE.Color(neutralHex), toneMapped: false });
    lerpStart.current = -1;
    invalidate();
    return () => {
      for (const s of map.values()) s.material.dispose();
      (base.material as THREE.Material).dispose();
    };
  }, [loaded, matcap, neutralHex, paintRef, invalidate]);

  useEffect(() => {
    gl.setClearColor(new THREE.Color(backgroundHex), 1);
    invalidate();
  }, [gl, backgroundHex, invalidate]);

  // New paint targets: snapshot current colors as `from` and start the lerp clock.
  useEffect(() => {
    snapshotFrom(materials.current);
    lerpStart.current = 0; // 0 = start on the next frame
    invalidate();
  }, [paintVersion, invalidate]);

  useEffect(() => {
    pulseStart.current = pulseRegions.length ? 0 : -1;
    invalidate();
  }, [pulseRegions, invalidate]);

  useFrame((state) => {
    const now = state.clock.elapsedTime * 1000;
    const rig = rigRef.current!;

    // Camera orbit: yaw around Y, pitch clamped by the gesture layer, distance from pinch, panY from two-finger drag.
    const cp = Math.cos(rig.pitch);
    scratchTarget.set(0, CAMERA.targetY + rig.panY, 0);
    scratchPos
      .set(
        Math.sin(rig.yaw) * cp * rig.distance,
        Math.sin(rig.pitch) * rig.distance,
        Math.cos(rig.yaw) * cp * rig.distance,
      )
      .add(scratchTarget);
    camera.position.copy(scratchPos);
    camera.lookAt(scratchTarget);

    let keepGoing = false;
    if (lerpStart.current >= 0) {
      if (lerpStart.current === 0) lerpStart.current = now;
      const t = Math.min(1, (now - lerpStart.current) / ANIMATION.colorLerpMs);
      const e = 1 - (1 - t) * (1 - t);
      applyLerp(materials.current, paintRef.current!, e);
      if (t < 1) keepGoing = true;
      else lerpStart.current = -1;
    }
    if (pulseStart.current >= 0) {
      if (pulseStart.current === 0) pulseStart.current = now;
      const elapsed = now - pulseStart.current;
      const t = Math.min(1, elapsed / ANIMATION.pulseMs);
      const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5; // two pulses over the window
      const boost = 1 + 0.25 * pulse * (1 - t);
      // Applied on top of the lerped colour so the pulse and the 400 ms lerp compose instead of fighting.
      for (const region of pulseRegions) {
        const s = materials.current.get(region);
        if (!s) continue;
        if (lerpStart.current < 0) s.material.color.copy(paintRef.current![region].color);
        s.material.color.multiplyScalar(boost);
      }
      if (t < 1) keepGoing = true;
      else pulseStart.current = -1;
    }
    if (keepGoing) invalidate();
    if (!firstFrameDone.current) {
      firstFrameDone.current = true;
      onFirstFrame();
    }
  });

  return <primitive object={loaded.root} />;
}
