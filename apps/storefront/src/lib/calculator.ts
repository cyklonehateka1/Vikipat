import {
  CalculatedEstimate,
  DimensionUnit,
  LARGE_FORMAT_MATERIALS,
} from "../types/pricing";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:3000/api"
).replace(/\/$/, "");

export function computeLocalEstimate(
  serviceCode: string,
  width: number,
  height: number,
  unit: DimensionUnit,
  quantity: number,
  needsDesign: boolean,
): CalculatedEstimate {
  const material =
    LARGE_FORMAT_MATERIALS.find((m) => m.code === serviceCode) ||
    LARGE_FORMAT_MATERIALS[0];
  const ratePesewas = material.walkInRatePesewas;

  const areaPerPieceSqFt =
    unit === "in" ? (width * height) / 144 : width * height;
  const totalAreaSqFt = areaPerPieceSqFt * quantity;

  // Raw base in pesewas
  const rawBasePesewas = totalAreaSqFt * ratePesewas;
  // Nearest-cedi policy (rounds to nearest 100 pesewas)
  const basePesewas = Math.round(rawBasePesewas / 100) * 100;

  // Design fee: minimum GH₵ 100 = 10,000 pesewas, triggers staff review for final approval
  const designFeePesewas = needsDesign ? 10000 : 0;
  const totalPesewas = basePesewas + designFeePesewas;

  return {
    serviceCode: material.code,
    serviceName: material.name,
    width,
    height,
    unit,
    quantity,
    areaPerPieceSqFt: Number(areaPerPieceSqFt.toFixed(3)),
    totalAreaSqFt: Number(totalAreaSqFt.toFixed(3)),
    ratePesewasPerSqFt: ratePesewas,
    basePesewas,
    designFeePesewas,
    totalPesewas,
    requiresReview: needsDesign,
    reviewReasons: needsDesign ? ["design_fee_requires_review"] : [],
    designMessage: needsDesign
      ? "Design work starts from GH₵100. Final fee is confirmed upon artwork brief review."
      : null,
  };
}

export async function fetchServerEstimate(
  serviceCode: string,
  width: number,
  height: number,
  unit: DimensionUnit,
  quantity: number,
  needsDesign: boolean,
): Promise<CalculatedEstimate> {
  try {
    const response = await fetch(`${API_BASE}/estimates/large-format`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceCode,
        width,
        height,
        unit,
        quantity,
        needsDesign,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        serviceCode: data.serviceCode,
        serviceName: data.name || data.serviceName,
        width: data.width,
        height: data.height,
        unit: data.unit,
        quantity: data.quantity,
        areaPerPieceSqFt: data.areaSqFt ?? data.areaPerPieceSqFt,
        totalAreaSqFt: data.totalAreaSqFt,
        ratePesewasPerSqFt: data.ratePesewas ?? data.ratePesewasPerSqFt,
        basePesewas: data.basePesewas,
        designFeePesewas: data.designFeePesewas,
        totalPesewas: data.totalPesewas,
        requiresReview: data.requiresReview,
        reviewReasons: data.reviewReasons || [],
        designMessage: data.designMessage,
        estimateId: data.estimateId,
        fingerprint: data.fingerprint,
      };
    }
  } catch (err) {
    console.warn("Using client-side pricing engine fallback", err);
  }

  return computeLocalEstimate(
    serviceCode,
    width,
    height,
    unit,
    quantity,
    needsDesign,
  );
}
