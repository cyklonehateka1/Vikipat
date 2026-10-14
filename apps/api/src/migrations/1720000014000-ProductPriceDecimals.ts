import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Product prices are set by staff and may have pence: store them as cedis with
 * exactly 2 decimal places (only print job totals are whole cedis).
 */
export class ProductPriceDecimals1720000014000 implements MigrationInterface {
  name = 'ProductPriceDecimals1720000014000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "price" TYPE numeric(12,2) USING ROUND("price"::numeric, 2)`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "price" TYPE integer USING ROUND("price")::integer`);
  }
}
