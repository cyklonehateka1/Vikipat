import { MigrationInterface, QueryRunner } from 'typeorm';

export class StaffAccessSchema1720000004000 implements MigrationInterface {
  name = 'StaffAccessSchema1720000004000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isActive" boolean NOT NULL DEFAULT true`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    // Revoke all sessions before removing the activation flag.
    await queryRunner.query(`UPDATE "users" SET "tokenVersion" = "tokenVersion" + 1`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "isActive"`);
  }
}
