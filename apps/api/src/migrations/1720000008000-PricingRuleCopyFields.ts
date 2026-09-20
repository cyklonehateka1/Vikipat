import { MigrationInterface, QueryRunner } from 'typeorm';

export class PricingRuleCopyFields1720000008000 implements MigrationInterface {
  name = 'PricingRuleCopyFields1720000008000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "service_price_rules" ADD COLUMN IF NOT EXISTS "category" varchar NOT NULL DEFAULT 'finish'`);
    await queryRunner.query(`ALTER TABLE "service_price_rules" ADD COLUMN IF NOT EXISTS "description" text NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "service_price_rules" ADD COLUMN IF NOT EXISTS "typicalUses" text NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "service_price_rules" ADD COLUMN IF NOT EXISTS "badge" varchar NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "service_price_rules" ADD COLUMN IF NOT EXISTS "outcomes" text NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "service_price_rules" ADD COLUMN IF NOT EXISTS "imageUrl" varchar NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "service_price_rules" ADD COLUMN IF NOT EXISTS "sortOrder" integer NOT NULL DEFAULT 0`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "service_price_rules" DROP COLUMN IF EXISTS "sortOrder"`);
    await queryRunner.query(`ALTER TABLE "service_price_rules" DROP COLUMN IF EXISTS "imageUrl"`);
    await queryRunner.query(`ALTER TABLE "service_price_rules" DROP COLUMN IF EXISTS "outcomes"`);
    await queryRunner.query(`ALTER TABLE "service_price_rules" DROP COLUMN IF EXISTS "badge"`);
    await queryRunner.query(`ALTER TABLE "service_price_rules" DROP COLUMN IF EXISTS "typicalUses"`);
    await queryRunner.query(`ALTER TABLE "service_price_rules" DROP COLUMN IF EXISTS "description"`);
    await queryRunner.query(`ALTER TABLE "service_price_rules" DROP COLUMN IF EXISTS "category"`);
  }
}
