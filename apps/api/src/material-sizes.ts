/**
 * Fixed sizes for print materials that only come in set sizes (paper stock,
 * for example). When a material's `allowCustomSize` is off, an estimate is
 * only accepted for one of its `fixedSizes`, in either orientation.
 * Sizes are stored on the rule as a JSON string.
 */
export interface MaterialSize {
  label: string;
  width: number;
  height: number;
  unit: 'ft' | 'in';
}

export function parseFixedSizes(raw: string | null | undefined): MaterialSize[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (size): size is MaterialSize =>
        typeof size?.label === 'string' &&
        Number.isFinite(size?.width) && size.width > 0 &&
        Number.isFinite(size?.height) && size.height > 0 &&
        (size?.unit === 'ft' || size?.unit === 'in'),
    );
  } catch {
    return [];
  }
}

const inInches = (value: number, unit: 'ft' | 'in') => (unit === 'ft' ? value * 12 : value);
const same = (a: number, b: number) => Math.abs(a - b) < 0.01;

/** Whether a requested size is one of the allowed sizes, turned either way. */
export function matchesFixedSize(sizes: MaterialSize[], width: number, height: number, unit: 'ft' | 'in') {
  const w = inInches(width, unit);
  const h = inInches(height, unit);
  return sizes.some((size) => {
    const sw = inInches(size.width, size.unit);
    const sh = inInches(size.height, size.unit);
    return (same(w, sw) && same(h, sh)) || (same(w, sh) && same(h, sw));
  });
}

/** The example data: photo paper is sold in standard ISO A sizes only. */
export const PHOTOPAPER_SIZES: MaterialSize[] = [
  { label: 'A4', width: 8.3, height: 11.7, unit: 'in' },
  { label: 'A3', width: 11.7, height: 16.5, unit: 'in' },
  { label: 'A2', width: 16.5, height: 23.4, unit: 'in' },
  { label: 'A1', width: 23.4, height: 33.1, unit: 'in' },
];
