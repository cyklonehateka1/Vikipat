import type { ProductionStage } from './entities';
export declare function allowedProductionStages(stage: ProductionStage): ProductionStage[];
export declare function permittedProductionStages(stage: ProductionStage, role: string): ProductionStage[];
