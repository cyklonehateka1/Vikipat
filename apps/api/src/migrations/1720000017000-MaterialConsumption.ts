import { MigrationInterface, QueryRunner } from 'typeorm';

/** One row per (job, material) consumption event. */
export class MaterialConsumption1720000017000 implements MigrationInterface {
  name = 'MaterialConsumption1720000017000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "material_consumption" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "jobId" varchar NOT NULL,
      "materialItemId" varchar NOT NULL,
      "materialName" varchar NOT NULL,
      "quantity" decimal(12,2) NOT NULL DEFAULT 0,
      "unit" varchar NOT NULL,
      "recordedBy" varchar NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_material_consumption_job_id" ON "material_consumption" ("jobId")`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_material_consumption_job_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "material_consumption"`);
  }
}
