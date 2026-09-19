import { Product } from '../catalog';

export type Sort = 'featured' | 'low' | 'high' | 'name';

export const sorts: { value: Sort; label: string }[] = [
  { value: 'featured', label: 'Featured first' },
  { value: 'low', label: 'Price, low to high' },
  { value: 'high', label: 'Price, high to low' },
  { value: 'name', label: 'Name, A to Z' },
];

export const isSort = (value: string | null): value is Sort =>
  sorts.some((option) => option.value === value);

/**
 * Sorting never promotes an out of stock line above one you can actually buy,
 * whichever order is chosen.
 */
export function sortProducts(products: Product[], sort: Sort) {
  const rank = (product: Product) => (product.availability === 'out' ? 1 : 0);

  return [...products].sort((a, b) => {
    const byStock = rank(a) - rank(b);
    if (byStock) return byStock;

    if (sort === 'low') return a.price - b.price;
    if (sort === 'high') return b.price - a.price;
    if (sort === 'name') return a.name.localeCompare(b.name);
    return Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name);
  });
}
