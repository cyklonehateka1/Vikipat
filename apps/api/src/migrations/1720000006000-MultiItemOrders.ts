import { MigrationInterface, QueryRunner } from 'typeorm';

export class MultiItemOrders1720000006000 implements MigrationInterface {
  name = 'MultiItemOrders1720000006000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "kind" character varying NOT NULL DEFAULT 'large_format'`);
    await queryRunner.query(`ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "productId" character varying NOT NULL DEFAULT ''`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN IF EXISTS "productId"`);
    await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN IF EXISTS "kind"`);
  }
}
