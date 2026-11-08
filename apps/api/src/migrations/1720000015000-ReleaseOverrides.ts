import { MigrationInterface, QueryRunner } from 'typeorm';

/** Who allowed an order into production while unpaid, and why. */
export class ReleaseOverrides1720000015000 implements MigrationInterface {
  name = 'ReleaseOverrides1720000015000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "release_overrides" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "orderId" varchar NOT NULL,
      "orderNumber" varchar NOT NULL,
      "reason" text NOT NULL,
      "actorEmail" varchar NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_release_overrides_order_id" ON "release_overrides" ("orderId")`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_release_overrides_order_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "release_overrides"`);
  }
}
