import { MigrationInterface, QueryRunner } from 'typeorm';

/** Configurable accounted-for tolerance for physical-count reconciliation. */
export class TolerancePercent1720000019000 implements MigrationInterface {
  name = 'TolerancePercent1720000019000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "material_items" ADD COLUMN IF NOT EXISTS "tolerancePercent" decimal(5,2) NOT NULL DEFAULT 90`);
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "tolerancePercent" decimal(5,2) NOT NULL DEFAULT 98`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "tolerancePercent"`);
    await queryRunner.query(`ALTER TABLE "material_items" DROP COLUMN IF EXISTS "tolerancePercent"`);
  }
}
