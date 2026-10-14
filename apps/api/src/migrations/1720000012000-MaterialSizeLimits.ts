import { MigrationInterface, QueryRunner } from 'typeorm';

/** Lets a print material be limited to a fixed list of sizes. */
export class MaterialSizeLimits1720000012000 implements MigrationInterface {
  name = 'MaterialSizeLimits1720000012000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "service_price_rules" ADD COLUMN IF NOT EXISTS "allowCustomSize" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "service_price_rules" ADD COLUMN IF NOT EXISTS "fixedSizes" text NOT NULL DEFAULT ''`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "service_price_rules" DROP COLUMN IF EXISTS "fixedSizes"`);
    await queryRunner.query(`ALTER TABLE "service_price_rules" DROP COLUMN IF EXISTS "allowCustomSize"`);
  }
}
