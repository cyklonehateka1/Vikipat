import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrderLookupIndices1720000007000 implements MigrationInterface {
  name = 'OrderLookupIndices1720000007000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_order_items_order_id" ON "order_items" ("orderId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_production_jobs_order_id" ON "production_jobs" ("orderId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_production_job_activity_job_id" ON "production_job_activity" ("jobId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_order_status_history_order_id" ON "order_status_history" ("orderId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_order_tracking_otps_order_id" ON "order_tracking_otps" ("orderId")`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_order_tracking_otps_order_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_order_status_history_order_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_production_job_activity_job_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_production_jobs_order_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_order_items_order_id"`);
  }
}
