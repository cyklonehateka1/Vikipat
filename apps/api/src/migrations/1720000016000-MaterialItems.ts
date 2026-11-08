import { MigrationInterface, QueryRunner } from 'typeorm';

/** Raw-material (consumable) stock, separate from finished-goods Product stock. */
export class MaterialItems1720000016000 implements MigrationInterface {
  name = 'MaterialItems1720000016000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "material_items" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" varchar NOT NULL,
      "unit" varchar NOT NULL,
      "stockQuantity" decimal(12,2) NOT NULL DEFAULT 0,
      "lowStockThreshold" decimal(12,2) NOT NULL DEFAULT 0,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "material_stock_activity" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "materialItemId" varchar NOT NULL,
      "materialName" varchar NOT NULL,
      "previousQuantity" decimal(12,2) NOT NULL DEFAULT 0,
      "newQuantity" decimal(12,2) NOT NULL DEFAULT 0,
      "reason" varchar NOT NULL,
      "actorEmail" varchar NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now())`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "material_stock_activity"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "material_items"`);
  }
}
