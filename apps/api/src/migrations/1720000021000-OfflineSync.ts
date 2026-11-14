import { MigrationInterface, QueryRunner } from 'typeorm';

/** Version columns for optimistic concurrency, and a table recording processed offline commands. */
export class OfflineSync1720000021000 implements MigrationInterface {
  name = 'OfflineSync1720000021000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1`);
    await queryRunner.query(`ALTER TABLE "production_jobs" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1`);
    await queryRunner.query(`ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1`);
    await queryRunner.query(`ALTER TABLE "material_items" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1`);
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "synced_commands" (
      "id" varchar PRIMARY KEY,
      "deviceId" varchar NOT NULL,
      "actorEmail" varchar NOT NULL,
      "result" text NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "synced_commands"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "version"`);
    await queryRunner.query(`ALTER TABLE "material_items" DROP COLUMN IF EXISTS "version"`);
    await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN IF EXISTS "version"`);
    await queryRunner.query(`ALTER TABLE "production_jobs" DROP COLUMN IF EXISTS "version"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "version"`);
  }
}
