import { MigrationInterface, QueryRunner } from 'typeorm';

/** Physical stock counts, frozen against the target's tolerance at record time. */
export class MaterialPhysicalCount1720000020000 implements MigrationInterface {
  name = 'MaterialPhysicalCount1720000020000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "material_physical_counts" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "targetKind" varchar NOT NULL,
      "targetId" varchar NOT NULL,
      "targetName" varchar NOT NULL,
      "measuredQuantity" decimal(12,2) NOT NULL,
      "expectedQuantity" decimal(12,2) NOT NULL,
      "accountedForPercent" decimal(5,2),
      "toleranceAtRecordPercent" decimal(5,2) NOT NULL,
      "recordedBy" varchar NOT NULL,
      "recordedAt" timestamptz NOT NULL DEFAULT now(),
      "note" varchar
    )`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_material_physical_counts_target" ON "material_physical_counts" ("targetKind", "targetId")`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "material_physical_counts"`);
  }
}
