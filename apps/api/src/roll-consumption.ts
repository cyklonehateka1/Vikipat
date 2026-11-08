import { EntityManager } from 'typeorm';
import { MaterialConsumption, MaterialItem, MaterialStockActivity, ProductionJob } from './entities';

/**
 * Narrower job dimension -> smallest roll width with enough stock -> fall
 * back to the next wider roll. The caller must own a transaction.
 */
export async function computeRollConsumption(manager: EntityManager, job: ProductionJob, actor: string): Promise<MaterialConsumption | null> {
  let spec: { width?: number; height?: number; unit?: 'ft' | 'in'; totalAreaSqFt?: number };
  try { spec = JSON.parse(job.specification || '{}'); } catch { spec = {}; }
  const { width, height, unit, totalAreaSqFt } = spec;
  if (!width || !height || !totalAreaSqFt || width <= 0 || height <= 0 || totalAreaSqFt <= 0) return null;

  const widthFt = unit === 'in' ? width / 12 : width;
  const heightFt = unit === 'in' ? height / 12 : height;
  const acrossRollMetres = Math.min(widthFt, heightFt) * 0.3048;

  const materials = manager.getRepository(MaterialItem);
  const candidates = (await materials.find({ where: { kind: 'roll', serviceCode: job.serviceCode } }))
    .sort((a, b) => a.rollWidthMetres! - b.rollWidthMetres!);

  // A job whose dimension in feet exactly equals a roll's width in metres
  // (e.g. 3ft -> 0.9144m) can fail this comparison on float error alone —
  // 3 * 0.3048 === 0.9144000000000001, not 0.9144 — which silently skips
  // the exact-fit roll for the next wider one. A tenth-of-a-millimetre
  // tolerance absorbs that without masking a genuinely too-narrow roll.
  const EPSILON_METRES = 1e-6;
  for (const roll of candidates) {
    if (roll.rollWidthMetres! < acrossRollMetres - EPSILON_METRES) continue;
    const rollWidthFt = roll.rollWidthMetres! / 0.3048;
    const lengthMetres = (totalAreaSqFt / rollWidthFt) * 0.3048;
    if (roll.stockQuantity < lengthMetres) continue;

    const previous = roll.stockQuantity;
    roll.stockQuantity -= lengthMetres;
    await materials.save(roll);

    const stocks = manager.getRepository(MaterialStockActivity);
    await stocks.save(stocks.create({ materialItemId: roll.id, materialName: roll.name, previousQuantity: previous, newQuantity: roll.stockQuantity, reason: `Job ${job.jobNumber}`, actorEmail: actor }));

    const consumption = manager.getRepository(MaterialConsumption);
    return consumption.save(consumption.create({ jobId: job.id, materialItemId: roll.id, materialName: roll.name, quantity: lengthMetres, unit: 'm', recordedBy: actor }));
  }
  return null;
}
