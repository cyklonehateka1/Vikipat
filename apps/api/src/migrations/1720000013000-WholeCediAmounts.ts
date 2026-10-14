import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Every amount is a whole cedi. Product prices were stored as decimal cedis;
 * round them and make the column an integer. The removed "exact pesewa"
 * rounding falls back to the nearest cedi.
 */
export class WholeCediAmounts1720000013000 implements MigrationInterface {
  name = 'WholeCediAmounts1720000013000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "price" TYPE integer USING ROUND("price")::integer`);
    await queryRunner.query(`UPDATE "service_price_rules" SET "roundingMode" = 'nearest_cedi' WHERE "roundingMode" = 'exact_pesewa'`);
    await queryRunner.query(`UPDATE "pricing_rule_drafts" SET "roundingMode" = 'nearest_cedi' WHERE "roundingMode" = 'exact_pesewa'`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "price" TYPE real USING "price"::real`);
  }
}
