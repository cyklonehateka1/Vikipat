import { hasPermission } from '@vikipat/domain';
import type { ProductionStage } from './entities';

// Blocked work restarts at artwork review so recovery cannot bypass checks.
const NEXT_STAGES: Record<ProductionStage, readonly ProductionStage[]> = {
  intake: ['artwork_review', 'blocked', 'cancelled'],
  artwork_review: ['proofing', 'production_ready', 'blocked', 'cancelled'],
  proofing: ['artwork_review', 'production_ready', 'blocked', 'cancelled'],
  production_ready: ['in_production', 'artwork_review', 'blocked', 'cancelled'],
  in_production: ['quality_check', 'blocked', 'cancelled'],
  quality_check: ['ready', 'in_production', 'blocked', 'cancelled'],
  ready: ['fulfilled', 'quality_check', 'blocked', 'cancelled'],
  fulfilled: [],
  blocked: ['artwork_review', 'cancelled'],
  cancelled: [],
};

export function allowedProductionStages(stage: ProductionStage): ProductionStage[] {
  return [stage, ...(NEXT_STAGES[stage] ?? [])];
}

export function permittedProductionStages(stage: ProductionStage, role: string): ProductionStage[] {
  if (!hasPermission(role, 'operations.read')) return [];
  return allowedProductionStages(stage).filter(next => {
    if (next === stage || hasPermission(role, 'jobs.supervise')) return true;
    if (next === 'cancelled') return false;
    if (['intake', 'artwork_review', 'proofing'].includes(stage) || (stage === 'production_ready' && next === 'artwork_review')) return hasPermission(role, 'jobs.artwork');
    if (['production_ready', 'in_production'].includes(stage)) return hasPermission(role, 'jobs.production');
    if (stage === 'quality_check') return hasPermission(role, 'jobs.qc');
    if (stage === 'ready') return hasPermission(role, 'jobs.dispatch');
    return false;
  });
}
