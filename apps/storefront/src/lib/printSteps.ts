/** Largest single dimension the estimate API accepts (LargeFormatEstimateDto). */
export const MAX_DIMENSION = 10000;

/** A typed width or height, or null when it cannot be priced. */
export function parseDimension(raw: string): number | null {
  if (!raw.trim()) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value > MAX_DIMENSION) return null;
  return value;
}

export type PrintStep = 'job' | 'size' | 'artwork';

/**
 * The step lives in the URL so the phone's back button walks back through the
 * flow. A cold load (refresh, shared link) may name a step whose inputs are
 * gone, so fall back to the furthest step we can actually show.
 */
export function resolveStep(param: string | null, hasJob: boolean, sizeConfirmed: boolean): PrintStep {
  if (!hasJob) return 'job';
  if (param === 'job') return 'job';
  if (param === 'artwork' && sizeConfirmed) return 'artwork';
  return 'size';
}
