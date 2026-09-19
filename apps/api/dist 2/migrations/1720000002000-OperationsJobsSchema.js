"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationsJobsSchema1720000002000 = void 0;
class OperationsJobsSchema1720000002000 {
    constructor() {
        this.name = 'OperationsJobsSchema1720000002000';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "production_jobs" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "orderId" varchar NOT NULL, "orderItemId" varchar NOT NULL, "orderNumber" varchar NOT NULL, "jobNumber" varchar NOT NULL UNIQUE, "customerName" varchar NOT NULL, "serviceCode" varchar NOT NULL, "title" varchar NOT NULL, "quantity" integer NOT NULL, "stage" varchar NOT NULL DEFAULT 'intake', "priority" varchar NOT NULL DEFAULT 'normal', "assignedTo" varchar NOT NULL DEFAULT '', "dueDate" varchar NOT NULL DEFAULT '', "specification" text NOT NULL DEFAULT '{}', "internalNote" varchar NOT NULL DEFAULT '', "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_production_jobs_stage_created" ON "production_jobs" ("stage", "createdAt")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_production_jobs_order" ON "production_jobs" ("orderId")`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS "production_jobs"`);
    }
}
exports.OperationsJobsSchema1720000002000 = OperationsJobsSchema1720000002000;
//# sourceMappingURL=1720000002000-OperationsJobsSchema.js.map