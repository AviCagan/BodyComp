/** Single place for the product name (working title — see docs/PLAN.md open question 1). */
export const APP_NAME = 'MuscleMap';

/** Bundled asset budgets from the brief (§6.2). Enforced by tools/model-pipeline/validate.ts. */
export const MODEL_BUDGET = {
  maxTriangles: 150_000,
  maxBytes: 8 * 1024 * 1024,
} as const;
