/** Camera framing and gesture tuning for the 3D map (§6.2 interaction spec). Model: stature 1.0, feet at y = 0, front = +Z. */
export const CAMERA = {
  fovDeg: 35,
  near: 0.05,
  far: 20,
  /** look-at height (model center) */
  targetY: 0.5,
  /** default distance: model ≈ 78% of viewport height */
  distance: 2.05,
  /** pinch clamps: never clipped, never smaller than ~60% of the viewport height */
  minDistance: 1.15,
  maxDistance: 2.6,
  /** two-finger vertical pan limits (world units, added to targetY) */
  minPanY: -0.3,
  maxPanY: 0.3,
} as const;

export const GESTURE = {
  /** radians of yaw per point of horizontal drag */
  yawPerPoint: 0.011,
  /** radians of pitch per point of vertical drag */
  pitchPerPoint: 0.008,
  maxPitch: (25 * Math.PI) / 180,
  /** withDecay deceleration: ~1.5 s to rest */
  decayDeceleration: 0.997,
  /** world units of pan per point of two-finger vertical drag, scaled by distance */
  panPerPoint: 0.0022,
  tapMaxDistance: 8,
  tapMaxDurationMs: 250,
  snapDurationMs: 300,
  /** auto-rotate (finish screen): seconds per revolution */
  autoRotateSecondsPerTurn: 12,
} as const;

export const ANIMATION = {
  /** status color changes lerp over this long */
  colorLerpMs: 400,
  /** selection pulse: two brightening pulses, then hold */
  pulseMs: 1200,
  /** unselected regions dim to this factor while something is selected */
  dimFactor: 0.7,
} as const;

export const SNAP_YAW = { front: 0, back: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 } as const;
