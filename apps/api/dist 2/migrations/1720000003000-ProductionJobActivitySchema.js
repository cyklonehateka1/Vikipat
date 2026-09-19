"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionJobActivitySchema1720000003000 = void 0;
class ProductionJobActivitySchema1720000003000 {
    constructor() {
        this.name = 'ProductionJobActivitySchema1720000003000';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "production_job_activity" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "jobId" varchar NOT NULL, "orderId" varchar NOT NULL, "jobNumber" varchar NOT NULL, "type" varchar NOT NULL DEFAULT 'note', "fromStage" varchar NOT NULL DEFAULT '', "toStage" varchar NOT NULL DEFAULT '', "note" text NOT NULL DEFAULT '', "actor" varchar NOT NULL DEFAULT 'system', "createdAt" timestamptz NOT NULL DEFAULT now())`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_production_job_activity_job_created" ON "production_job_activity" ("jobId", "createdAt")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_production_job_activity_order_created" ON "production_job_activity" ("orderId", "createdAt")`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS "production_job_activity"`);
    }
}
exports.ProductionJobActivitySchema1720000003000 = ProductionJobActivitySchema1720000003000;
//# sourceMappingURL=1720000003000-ProductionJobActivitySchema.js.map