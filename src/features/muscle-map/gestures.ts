import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useSharedValue,
  withDecay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { CAMERA, GESTURE, SNAP_YAW } from './constants';
import type { SnapView } from './types';

/** Camera rig state mirrored to the JS thread; the scene reads it in useFrame. */
export interface RigState {
  yaw: number;
  pitch: number;
  distance: number;
  panY: number;
}

export interface UseMapGesturesArgs {
  enabled: boolean;
  autoRotate: boolean;
  /** Called on the JS thread after every rig change (already coalesced per UI frame). */
  onRigChange: (rig: RigState) => void;
  onTap: (x: number, y: number) => void;
}

function writeRig(rig: RigState, yaw: number, pitch: number, distance: number, panY: number): RigState {
  rig.yaw = yaw;
  rig.pitch = pitch;
  rig.distance = distance;
  rig.panY = panY;
  return rig;
}

function clamp(v: number, lo: number, hi: number): number {
  'worklet';
  return v < lo ? lo : v > hi ? hi : v;
}

/** Nearest angle equivalent to `target` from `current` (so snaps rotate the short way). */
function nearestTurn(current: number, target: number): number {
  'worklet';
  const twoPi = Math.PI * 2;
  let t = target + Math.round((current - target) / twoPi) * twoPi;
  if (t - current > Math.PI) t -= twoPi;
  if (current - t > Math.PI) t += twoPi;
  return t;
}

/**
 * §6.2 interaction spec on the UI thread: one-finger drag rotates (yaw unbounded,
 * pitch ±25°) with friction inertia; pinch zooms within clamps; two-finger drag pans
 * vertically; double-tap resets; tap (< 8 pt, < 250 ms) picks. Shared values are the
 * source of truth; a single animated reaction mirrors them to the JS thread and the
 * scene requests exactly one render per change (frameloop="demand").
 */
export function useMapGestures({ enabled, autoRotate, onRigChange, onTap }: UseMapGesturesArgs) {
  const yaw = useSharedValue(0);
  const pitch = useSharedValue(0);
  const distance = useSharedValue<number>(CAMERA.distance);
  const panY = useSharedValue(0);
  const startYaw = useSharedValue(0);
  const startPitch = useSharedValue(0);
  const startDistance = useSharedValue<number>(CAMERA.distance);
  const startPanY = useSharedValue(0);

  // Preallocated JS-side mirror: no per-frame allocations on the JS thread.
  const rigRef = useRef<RigState>({ yaw: 0, pitch: 0, distance: CAMERA.distance, panY: 0 });
  const applyRig = useCallback(
    (y: number, p: number, d: number, pan: number) => {
      onRigChange(writeRig(rigRef.current, y, p, d, pan));
    },
    [onRigChange],
  );

  useAnimatedReaction(
    () => [yaw.get(), pitch.get(), distance.get(), panY.get()] as const,
    (cur, prev) => {
      if (!prev || cur[0] !== prev[0] || cur[1] !== prev[1] || cur[2] !== prev[2] || cur[3] !== prev[3]) {
        scheduleOnRN(applyRig, cur[0], cur[1], cur[2], cur[3]);
      }
    },
    [applyRig],
  );

  useEffect(() => {
    if (autoRotate) {
      yaw.set(
        withRepeat(
          withTiming(yaw.get() + Math.PI * 2, {
            duration: GESTURE.autoRotateSecondsPerTurn * 1000,
            easing: Easing.linear,
          }),
          -1,
          false,
        ),
      );
    } else {
      cancelAnimation(yaw);
    }
  }, [autoRotate, yaw]);

  const snapTo = useCallback(
    (view: SnapView) => {
      const cfg = { duration: GESTURE.snapDurationMs, easing: Easing.out(Easing.cubic) };
      const target = nearestTurn(yaw.get(), SNAP_YAW[view]);
      yaw.set(withTiming(target, cfg));
      pitch.set(withTiming(0, cfg));
    },
    [yaw, pitch],
  );

  const resetView = useCallback(() => {
    const cfg = { duration: GESTURE.snapDurationMs, easing: Easing.out(Easing.cubic) };
    yaw.set(withTiming(nearestTurn(yaw.get(), 0), cfg));
    pitch.set(withTiming(0, cfg));
    distance.set(withTiming(CAMERA.distance, cfg));
    panY.set(withTiming(0, cfg));
  }, [yaw, pitch, distance, panY]);

  const gesture = useMemo(() => {
    const rotate = Gesture.Pan()
      .enabled(enabled)
      .maxPointers(1)
      .onBegin(() => {
        cancelAnimation(yaw);
        cancelAnimation(pitch);
      })
      .onStart(() => {
        startYaw.set(yaw.get());
        startPitch.set(pitch.get());
      })
      .onUpdate((e) => {
        yaw.set(startYaw.get() + e.translationX * GESTURE.yawPerPoint);
        pitch.set(
          clamp(startPitch.get() + e.translationY * GESTURE.pitchPerPoint, -GESTURE.maxPitch, GESTURE.maxPitch),
        );
      })
      .onEnd((e) => {
        yaw.set(withDecay({ velocity: e.velocityX * GESTURE.yawPerPoint, deceleration: GESTURE.decayDeceleration }));
        pitch.set(
          withDecay({
            velocity: e.velocityY * GESTURE.pitchPerPoint,
            deceleration: GESTURE.decayDeceleration,
            clamp: [-GESTURE.maxPitch, GESTURE.maxPitch],
          }),
        );
      });

    const pinch = Gesture.Pinch()
      .enabled(enabled)
      .onStart(() => {
        startDistance.set(distance.get());
      })
      .onUpdate((e) => {
        distance.set(clamp(startDistance.get() / Math.max(e.scale, 0.01), CAMERA.minDistance, CAMERA.maxDistance));
      });

    const pan = Gesture.Pan()
      .enabled(enabled)
      .minPointers(2)
      .maxPointers(2)
      .averageTouches(true)
      .onStart(() => {
        startPanY.set(panY.get());
      })
      .onUpdate((e) => {
        // dragging up moves the camera target up so the user inspects higher regions
        panY.set(
          clamp(
            startPanY.get() + e.translationY * GESTURE.panPerPoint * distance.get(),
            CAMERA.minPanY,
            CAMERA.maxPanY,
          ),
        );
      });

    const tap = Gesture.Tap()
      .enabled(enabled)
      .maxDistance(GESTURE.tapMaxDistance)
      .maxDuration(GESTURE.tapMaxDurationMs)
      .onEnd((e, success) => {
        if (success) scheduleOnRN(onTap, e.x, e.y);
      });

    const doubleTap = Gesture.Tap()
      .enabled(enabled)
      .numberOfTaps(2)
      .maxDistance(GESTURE.tapMaxDistance)
      .onEnd((_e, success) => {
        if (success) scheduleOnRN(resetView);
      });

    return Gesture.Simultaneous(rotate, pinch, pan, Gesture.Exclusive(doubleTap, tap));
    // shared values are stable; the composition changes with `enabled` and the JS callbacks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, onTap, resetView]);

  return { gesture, rigRef, snapTo, resetView };
}
