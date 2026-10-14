import { MaterialSize, PrintMaterial } from '../types/pricing';

/** The sizes a material is limited to, or null when any size is allowed. */
export function lockedSizes(material?: PrintMaterial): MaterialSize[] | null {
  if (!material || material.allowCustomSize !== false) return null;
  return material.fixedSizes?.length ? material.fixedSizes : null;
}

const inInches = (value: number, unit: 'ft' | 'in') => (unit === 'ft' ? value * 12 : value);
const same = (a: number, b: number) => Math.abs(a - b) < 0.01;

/** Same rule as the API: a listed size, turned either way. */
export function isListedSize(sizes: MaterialSize[], width: number, height: number, unit: 'ft' | 'in') {
  const w = inInches(width, unit);
  const h = inInches(height, unit);
  return sizes.some((size) => {
    const sw = inInches(size.width, size.unit);
    const sh = inInches(size.height, size.unit);
    return (same(w, sw) && same(h, sh)) || (same(w, sh) && same(h, sw));
  });
}
