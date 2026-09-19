import { createHash } from 'node:crypto';
import type { DimensionUnit, EstimateDisposition, PriceBookCode } from '@vikipat/domain';

export type RoundingMode = 'nearest_cedi' | 'up_to_cedi' | 'exact_pesewa';
export type RoundingStage = 'line';

export interface AreaRateBook {
  online: number;
  walk_in: number;
  marketer: number;
  employee: number;
}

export interface LargeFormatRule {
  serviceCode: string;
  serviceName: string;
  version: number;
  ratesPesewasPerSqFt: AreaRateBook;
  designMinimumPesewas: number;
  roundingMode: RoundingMode;
  roundingStage: RoundingStage;
}

export interface LargeFormatInput {
  width: number;
  height: number;
  unit: DimensionUnit;
  quantity: number;
  priceBook: PriceBookCode;
  needsDesign: boolean;
  confirmedDesignFeePesewas?: number;
}

export interface LargeFormatEstimate {
  calculator: 'large_format_area';
  disposition: EstimateDisposition;
  serviceCode: string;
  serviceName: string;
  ruleVersion: number;
  width: number;
  height: number;
  unit: DimensionUnit;
  quantity: number;
  areaPerPieceSqFt: number;
  totalAreaSqFt: number;
  priceBook: PriceBookCode;
  ratePesewasPerSqFt: number;
  basePesewas: number;
  designFeePesewas: number;
  totalPesewas: number;
  requiresReview: boolean;
  reviewReasons: string[];
  roundingMode: RoundingMode;
  roundingStage: RoundingStage;
  fingerprint: string;
}

const normalizeNumber = (value: number): number => Number(value.toFixed(6));

const roundMoney = (rawPesewas: number, mode: RoundingMode): number => {
  if (mode === 'nearest_cedi') return Math.round(rawPesewas / 100) * 100;
  if (mode === 'up_to_cedi') return Math.ceil(rawPesewas / 100) * 100;
  return Math.round(rawPesewas);
};

const validate = (rule: LargeFormatRule, input: LargeFormatInput): void => {
  if (!rule.serviceCode || !rule.serviceName) throw new RangeError('A service code and name are required');
  if (!Number.isInteger(rule.version) || rule.version < 1) throw new RangeError('Rule version must be a positive integer');
  if (!Number.isFinite(input.width) || input.width <= 0) throw new RangeError('Width must be greater than zero');
  if (!Number.isFinite(input.height) || input.height <= 0) throw new RangeError('Height must be greater than zero');
  if (!Number.isSafeInteger(input.quantity) || input.quantity < 1) throw new RangeError('Quantity must be a positive integer');
  const rate = rule.ratesPesewasPerSqFt[input.priceBook];
  if (!Number.isSafeInteger(rate) || rate < 0) throw new RangeError('Rate must be a non-negative integer number of pesewas');
  if (!Number.isSafeInteger(rule.designMinimumPesewas) || rule.designMinimumPesewas < 0) throw new RangeError('Design minimum must be non-negative pesewas');
  if (input.confirmedDesignFeePesewas !== undefined && (!Number.isSafeInteger(input.confirmedDesignFeePesewas) || input.confirmedDesignFeePesewas < rule.designMinimumPesewas)) {
    throw new RangeError('Confirmed design fee cannot be below the configured minimum');
  }
};

export const calculateLargeFormat = (rule: LargeFormatRule, input: LargeFormatInput): LargeFormatEstimate => {
  validate(rule, input);
  const areaPerPieceSqFt = input.unit === 'in'
    ? (input.width * input.height) / 144
    : input.width * input.height;
  const totalAreaSqFt = areaPerPieceSqFt * input.quantity;
  const ratePesewasPerSqFt = rule.ratesPesewasPerSqFt[input.priceBook];
  const basePesewas = roundMoney(totalAreaSqFt * ratePesewasPerSqFt, rule.roundingMode);
  const requiresDesignReview = input.needsDesign && input.confirmedDesignFeePesewas === undefined;
  const designFeePesewas = input.needsDesign
    ? input.confirmedDesignFeePesewas ?? rule.designMinimumPesewas
    : 0;
  const reviewReasons = requiresDesignReview ? ['design_fee_requires_review'] : [];
  const normalized = {
    calculator: 'large_format_area',
    serviceCode: rule.serviceCode,
    ruleVersion: rule.version,
    width: normalizeNumber(input.width),
    height: normalizeNumber(input.height),
    unit: input.unit,
    quantity: input.quantity,
    priceBook: input.priceBook,
    ratePesewasPerSqFt,
    needsDesign: input.needsDesign,
    confirmedDesignFeePesewas: input.confirmedDesignFeePesewas ?? null,
    roundingMode: rule.roundingMode,
    roundingStage: rule.roundingStage,
  };

  return {
    calculator: 'large_format_area',
    disposition: requiresDesignReview ? 'provisional' : 'final',
    serviceCode: rule.serviceCode,
    serviceName: rule.serviceName,
    ruleVersion: rule.version,
    width: input.width,
    height: input.height,
    unit: input.unit,
    quantity: input.quantity,
    areaPerPieceSqFt: normalizeNumber(areaPerPieceSqFt),
    totalAreaSqFt: normalizeNumber(totalAreaSqFt),
    priceBook: input.priceBook,
    ratePesewasPerSqFt,
    basePesewas,
    designFeePesewas,
    totalPesewas: basePesewas + designFeePesewas,
    requiresReview: requiresDesignReview,
    reviewReasons,
    roundingMode: rule.roundingMode,
    roundingStage: rule.roundingStage,
    fingerprint: createHash('sha256').update(JSON.stringify(normalized)).digest('hex'),
  };
};
