import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { CAMERA, GESTURE, SNAP_YAW_DEG } from './constants';
import type { SnapView } from './types';

/** Camera rig state mirrored to the JS thread (radians / world units); the scene reads it in useFrame. */
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

const DEG = Math.PI / 180;

function writeRig(rig: RigState, yawDeg: number, pitchDeg: number, distance: number, panY: number): RigState {
  rig.yaw = yawDeg * DEG;
  rig.pitch = pitchDeg * DEG;
  rig.distance = distance;
  rig.panY = panY;
  return rig;
}

function clamp(v: number, lo: number, hi: number): number {
  'worklet';
  return v < lo ? lo : v > hi ? hi : v;
}

/** Nearest angle (degrees) equivalent to `target` from `current`, so snaps rotate the short way. */
function nearestTurn(current: number, target: number): number {
  'worklet';
  let t = target + Math.round((current - target) / 360) * 360;
  if (t - current > 180) t -= 360;
  if (current - t > 180) t += 360;
  return t;
}

/**
 * Refresh-rate independent inertia: same initial slope as the fling velocity, rests in
 * exactly `INERTIA_MS`. (Reanimated's withDecay compounds per frame, so its time-to-rest
 * differs ~35% between 60 Hz and 120 Hz displays, and it stops abruptly below 1 unit/s.)
 */
function fling(from: number, velocityPerSec: number, lo?: number, hi?: number) {
  'worklet';
  let target = from + (velocityPerSec * GESTURE.inertiaMs) / 3000;
  if (lo !== undefined && hi !== undefined) target = clamp(target, lo, hi);
  return withTiming(target, { duration: GESTURE.inertiaMs, easing: Easing.out(Easing.cubic) });
}

/**
 * §6.2 interaction spec on the UI thread. Angles are kept in DEGREES inside shared values
 * (Reanimated animations use unit/s thresholds) and converted to radians when mirrored to JS.
 * One Pan handles one finger (orbit) and two fingers (vertical pan) via delta updates, so
 * finger-count transitions are seamless; pinch runs simultaneously; taps race against them so
 * a tap can never fire mid-drag. A single animated reaction mirrors the rig to the JS thread
 * and the scene renders exactly once per change (frameloop="demand").
 */
export function useMapGestures({ enabled, autoRotate, onRigChange, onTap }: UseMapGesturesArgs) {
  const yawDeg = useSharedValue(0);
  const pitchDeg = useSharedValue(0);
  const distance = useSharedValue<number>(CAMERA.distance);
  const panY = useSharedValue(0);
  const startDistance = useSharedValue<number>(CAMERA.distance);

  // Preallocated JS-side mirror: no per-frame allocations on the JS thread.
  const rigRef = useRef<RigState>({ yaw: 0, pitch: 0, distance: CAMERA.distance, panY: 0 });
  const applyRig = useCallback(
    (y: number, p: number, d: number, pan: number) => {
      onRigChange(writeRig(rigRef.current, y, p, d, pan));
    },
    [onRigChange],
  );

  useAnimatedReaction(
    () => [yawDeg.get(), pitchDeg.get(), distance.get(), panY.get()] as const,
    (cur, prev) => {
      if (!prev || cur[0] !== prev[0] || cur[1] !== prev[1] || cur[2] !== prev[2] || cur[3] !== prev[3]) {
        scheduleOnRN(applyRig, cur[0], cur[1], cur[2], cur[3]);
      }
    },
    [applyRig],
  );

  useEffect(() => {
    if (autoRotate) {
      yawDeg.set(
        withRepeat(
          withTiming(yawDeg.get() + 360, { duration: GESTURE.autoRotateSecondsPerTurn * 1000, easing: Easing.linear }),
          -1,
          false,
        ),
      );
    } else {
      cancelAnimation(yawDeg);
    }
  }, [autoRotate, yawDeg]);

  const snapTo = useCallback(
    (view: SnapView) => {
      const cfg = { duration: GESTURE.snapDurationMs, easing: Easing.out(Easing.cubic) };
      yawDeg.set(withTiming(nearestTurn(yawDeg.get(), SNAP_YAW_DEG[view]), cfg));
      pitchDeg.set(withTiming(0, cfg));
    },
    [yawDeg, pitchDeg],
  );

  const resetView = useCallback(() => {
    const cfg = { duration: GESTURE.snapDurationMs, easing: Easing.out(Easing.cubic) };
    yawDeg.set(withTiming(nearestTurn(yawDeg.get(), 0), cfg));
    pitchDeg.set(withTiming(0, cfg));
    distance.set(withTiming(CAMERA.distance, cfg));
    panY.set(withTiming(0, cfg));
  }, [yawDeg, pitchDeg, distance, panY]);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .enabled(enabled)
      .minPointers(1)
      .maxPointers(2)
      .averageTouches(true)
      .onBegin(() => {
        // touch-down stops any inertia or snap immediately
        cancelAnimation(yawDeg);
        cancelAnimation(pitchDeg);
        cancelAnimation(distance);
        cancelAnimation(panY);
      })
      .onChange((e) => {
        if (e.numberOfPointers >= 2) {
          panY.set(
            clamp(panY.get() + e.changeY * GESTURE.panPerPoint * distance.get(), CAMERA.minPanY, CAMERA.maxPanY),
          );
        } else {
          yawDeg.set(yawDeg.get() + e.changeX * GESTURE.yawDegPerPoint);
          pitchDeg.set(
            clamp(pitchDeg.get() + e.changeY * GESTURE.pitchDegPerPoint, -GESTURE.maxPitchDeg, GESTURE.maxPitchDeg),
          );
        }
      })
      .onEnd((e) => {
        if (e.numberOfPointers >= 2) return;
        yawDeg.set(fling(yawDeg.get(), e.velocityX * GESTURE.yawDegPerPoint));
        pitchDeg.set(
          fling(pitchDeg.get(), e.velocityY * GESTURE.pitchDegPerPoint, -GESTURE.maxPitchDeg, GESTURE.maxPitchDeg),
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
      .maxDelay(GESTURE.doubleTapMaxDelayMs)
      // Android measures the distance from the first tap across the whole sequence.
      .maxDistance(GESTURE.doubleTapMaxDistance)
      .onEnd((_e, success) => {
        if (success) scheduleOnRN(resetView);
      });

    // Race: whichever activates first cancels the others. Pan activates after touch slop,
    // which fails the taps; a clean tap never moves far enough to activate the pan.
    return Gesture.Race(Gesture.Exclusive(doubleTap, tap), Gesture.Simultaneous(pan, pinch));
    // shared values are stable; the composition changes with `enabled` and the JS callbacks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, onTap, resetView]);

  return { gesture, rigRef, snapTo, resetView };
}
