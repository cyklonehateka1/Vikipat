import { MigrationInterface, QueryRunner } from 'typeorm';

/** Lets a material be a specific roll width feeding a print service. */
export class MaterialItemRoll1720000018000 implements MigrationInterface {
  name = 'MaterialItemRoll1720000018000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "material_items" ADD COLUMN IF NOT EXISTS "kind" varchar NOT NULL DEFAULT 'count'`);
    await queryRunner.query(`ALTER TABLE "material_items" ADD COLUMN IF NOT EXISTS "rollWidthMetres" decimal(12,4)`);
    await queryRunner.query(`ALTER TABLE "material_items" ADD COLUMN IF NOT EXISTS "serviceCode" varchar`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "material_items" DROP COLUMN IF EXISTS "serviceCode"`);
    await queryRunner.query(`ALTER TABLE "material_items" DROP COLUMN IF EXISTS "rollWidthMetres"`);
    await queryRunner.query(`ALTER TABLE "material_items" DROP COLUMN IF EXISTS "kind"`);
  }
}
