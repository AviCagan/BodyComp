/** Single place for the product name. Decided by the product owner on 2026-09-08 (ADR-0020). */
export const APP_NAME = 'Show up';

/** Bundled asset budgets from the brief (§6.2). Enforced by tools/model-pipeline/validate.ts. */
export const MODEL_BUDGET = {
  maxTriangles: 150_000,
  maxBytes: 8 * 1024 * 1024,
} as const;
