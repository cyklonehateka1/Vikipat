export type DimensionUnit = "ft" | "in";

export type MaterialCategory = "banner" | "sticker" | "board" | "fabric" | "finish";

/** A print substrate, as served by the API — the storefront holds no rates or copy of its own. */
export interface PrintMaterial {
  code: string;
  name: string;
  category: MaterialCategory;
  description: string;
  typicalUses: string;
  badge?: string;
  /** Outcome slugs this material is recommended for — see outcomes.ts */
  outcomes: string[];
  imageUrl?: string;
  ratePesewasPerSqFt: number;
  designMinimumPesewas: number;
}

export interface PrintJobSpec {
  serviceCode: string;
  serviceName: string;
  width: number;
  height: number;
  unit: DimensionUnit;
  quantity: number;
  needsDesign: boolean;
  notes?: string;
}

export interface CalculatedEstimate {
  serviceCode: string;
  serviceName: string;
  width: number;
  height: number;
  unit: DimensionUnit;
  quantity: number;
  areaPerPieceSqFt: number;
  totalAreaSqFt: number;
  ratePesewasPerSqFt: number;
  basePesewas: number;
  designFeePesewas: number;
  totalPesewas: number;
  requiresReview: boolean;
  reviewReasons: string[];
  designMessage: string | null;
  estimateId?: string;
  fingerprint?: string;
}
