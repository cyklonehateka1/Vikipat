import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentCheckoutSchema1720000001000 implements MigrationInterface {
  name = 'PaymentCheckoutSchema1720000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentProvider" varchar NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentReference" varchar NOT NULL DEFAULT ''`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "payment_transactions" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "orderId" varchar NOT NULL, "orderNumber" varchar NOT NULL, "provider" varchar NOT NULL, "reference" varchar NOT NULL UNIQUE, "amountPesewas" integer NOT NULL, "currency" varchar NOT NULL, "status" varchar NOT NULL DEFAULT 'initialized', "authorizationUrl" varchar NOT NULL DEFAULT '', "accessCode" varchar NOT NULL DEFAULT '', "providerResponse" text NOT NULL DEFAULT '{}', "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "production_jobs" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "orderId" varchar NOT NULL, "orderItemId" varchar NOT NULL, "orderNumber" varchar NOT NULL, "jobNumber" varchar NOT NULL UNIQUE, "customerName" varchar NOT NULL, "serviceCode" varchar NOT NULL, "title" varchar NOT NULL, "quantity" integer NOT NULL, "stage" varchar NOT NULL DEFAULT 'intake', "priority" varchar NOT NULL DEFAULT 'normal', "assignedTo" varchar NOT NULL DEFAULT '', "dueDate" varchar NOT NULL DEFAULT '', "specification" text NOT NULL DEFAULT '{}', "internalNote" varchar NOT NULL DEFAULT '', "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_payment_transactions_order" ON "payment_transactions" ("orderId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_production_jobs_stage_created" ON "production_jobs" ("stage", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_production_jobs_order" ON "production_jobs" ("orderId")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "production_jobs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_transactions"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "paymentReference"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "paymentProvider"`);
  }
}
