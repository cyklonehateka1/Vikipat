export type OrderSource = 'online' | 'walk_in' | 'salesperson';
export type PriceBookCode = 'online' | 'walk_in' | 'marketer' | 'employee';
export type EstimateDisposition = 'final' | 'provisional' | 'manual_review' | 'invalid';
export type DimensionUnit = 'ft' | 'in';

export type Money = Readonly<{
  currency: 'GHS';
  amountPesewas: number;
}>;

export const priceBookForSource = (source: OrderSource): PriceBookCode => {
  if (source === 'walk_in') return 'walk_in';
  if (source === 'salesperson') return 'marketer';
  return 'online';
};

export const assertPesewas = (value: number, field = 'amountPesewas'): number => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
  return value;
};

export * from './permissions';
