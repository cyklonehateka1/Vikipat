import { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueProductionOrderItem1720000005000 implements MigrationInterface {
  name = 'UniqueProductionOrderItem1720000005000';
  async up(queryRunner: QueryRunner): Promise<void> {
    // Fail rather than deleting historical jobs if legacy duplicates need reconciliation.
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "idx_production_jobs_order_item_unique" ON "production_jobs" ("orderItemId")`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_production_jobs_order_item_unique"`);
  }
}
