import type { PrintMaterial } from '../types/pricing';

/**
 * Cheapest rate, in pesewas per sq ft, among materials recommended for an
 * outcome. Finishing-only services (such as cutting vinyl the customer brings)
 * are left out, so "From GH₵…" always quotes something we actually print.
 */
export function minRateFor(
  materials: Pick<PrintMaterial, 'outcomes' | 'ratePesewasPerSqFt' | 'category'>[],
  outcomeSlug: string,
): number | null {
  const rates = materials
    .filter((material) => material.outcomes.includes(outcomeSlug) && material.category !== 'finish')
    .map((material) => material.ratePesewasPerSqFt);
  return rates.length ? Math.min(...rates) : null;
}

/** Cheapest product price, in cedis, across the named catalogue departments. */
export function minPriceIn(
  products: { department: string; price: number }[],
  departments: string[],
): number | null {
  const prices = products
    .filter((product) => departments.includes(product.department))
    .map((product) => product.price);
  return prices.length ? Math.min(...prices) : null;
}
