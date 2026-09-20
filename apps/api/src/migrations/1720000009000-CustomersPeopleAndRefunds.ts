import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Customer identity (guest checkout still, but repeat buyers roll up by
 * email), refund bookkeeping on orders, the people/payroll tables, and
 * single-use password reset grants.
 */
export class CustomersPeopleAndRefunds1720000009000 implements MigrationInterface {
  name = 'CustomersPeopleAndRefunds1720000009000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "customers" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "email" varchar NOT NULL UNIQUE,
      "name" varchar NOT NULL DEFAULT '',
      "company" varchar NOT NULL DEFAULT '',
      "phones" text NOT NULL DEFAULT '[]',
      "orderCount" integer NOT NULL DEFAULT 0,
      "lifetimeValuePesewas" integer NOT NULL DEFAULT 0,
      "firstOrderAt" timestamptz,
      "lastOrderAt" timestamptz,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_customers_email" ON "customers" ("email")`);

    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customerId" varchar NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "refundedPesewas" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "refundReason" text NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "refundedAt" timestamptz`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "refundedBy" varchar NOT NULL DEFAULT ''`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orders_customer_id" ON "orders" ("customerId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orders_customer_email" ON "orders" ("customerEmail")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orders_created_at" ON "orders" ("createdAt")`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "employees" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "staffNumber" varchar NOT NULL UNIQUE,
      "fullName" varchar NOT NULL,
      "email" varchar NOT NULL DEFAULT '',
      "phone" varchar NOT NULL DEFAULT '',
      "userId" varchar NOT NULL DEFAULT '',
      "jobTitle" varchar NOT NULL DEFAULT '',
      "department" varchar NOT NULL DEFAULT 'production',
      "employmentStatus" varchar NOT NULL DEFAULT 'active',
      "payType" varchar NOT NULL DEFAULT 'monthly',
      "payRatePesewas" integer NOT NULL DEFAULT 0,
      "bankName" varchar NOT NULL DEFAULT '',
      "bankAccount" varchar NOT NULL DEFAULT '',
      "momoNumber" varchar NOT NULL DEFAULT '',
      "ssnitNumber" varchar NOT NULL DEFAULT '',
      "hiredOn" varchar NOT NULL DEFAULT '',
      "notes" text NOT NULL DEFAULT '',
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_employees_user_id" ON "employees" ("userId")`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "attendance_records" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "employeeId" varchar NOT NULL,
      "employeeName" varchar NOT NULL,
      "workDate" varchar NOT NULL,
      "clockIn" timestamptz NOT NULL,
      "clockOut" timestamptz,
      "minutesWorked" integer NOT NULL DEFAULT 0,
      "overtimeMinutes" integer NOT NULL DEFAULT 0,
      "status" varchar NOT NULL DEFAULT 'present',
      "note" text NOT NULL DEFAULT '',
      "recordedBy" varchar NOT NULL DEFAULT '',
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_attendance_employee" ON "attendance_records" ("employeeId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_attendance_work_date" ON "attendance_records" ("workDate")`);
    // One open shift per employee at a time: a second clock-in without a
    // clock-out is a mistake, not a second shift.
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "idx_attendance_open_shift" ON "attendance_records" ("employeeId") WHERE "clockOut" IS NULL`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "payroll_runs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "reference" varchar NOT NULL UNIQUE,
      "periodStart" varchar NOT NULL,
      "periodEnd" varchar NOT NULL,
      "status" varchar NOT NULL DEFAULT 'draft',
      "grossPesewas" integer NOT NULL DEFAULT 0,
      "deductionsPesewas" integer NOT NULL DEFAULT 0,
      "netPesewas" integer NOT NULL DEFAULT 0,
      "payslipCount" integer NOT NULL DEFAULT 0,
      "preparedBy" varchar NOT NULL DEFAULT '',
      "approvedBy" varchar NOT NULL DEFAULT '',
      "paidAt" timestamptz,
      "note" text NOT NULL DEFAULT '',
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now())`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "payslips" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "payrollRunId" varchar NOT NULL,
      "employeeId" varchar NOT NULL,
      "employeeName" varchar NOT NULL,
      "staffNumber" varchar NOT NULL,
      "payType" varchar NOT NULL DEFAULT 'monthly',
      "payRatePesewas" integer NOT NULL DEFAULT 0,
      "daysWorked" integer NOT NULL DEFAULT 0,
      "minutesWorked" integer NOT NULL DEFAULT 0,
      "overtimeMinutes" integer NOT NULL DEFAULT 0,
      "basePesewas" integer NOT NULL DEFAULT 0,
      "overtimePesewas" integer NOT NULL DEFAULT 0,
      "bonusPesewas" integer NOT NULL DEFAULT 0,
      "deductionsPesewas" integer NOT NULL DEFAULT 0,
      "grossPesewas" integer NOT NULL DEFAULT 0,
      "netPesewas" integer NOT NULL DEFAULT 0,
      "note" text NOT NULL DEFAULT '',
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_payslips_run" ON "payslips" ("payrollRunId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_payslips_employee" ON "payslips" ("employeeId")`);
    // An employee appears at most once per run.
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "idx_payslips_run_employee" ON "payslips" ("payrollRunId", "employeeId")`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" varchar NOT NULL,
      "tokenHash" varchar NOT NULL,
      "expiresAt" timestamptz NOT NULL,
      "usedAt" timestamptz,
      "requestedIp" varchar NOT NULL DEFAULT '',
      "createdAt" timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_reset_tokens_user" ON "password_reset_tokens" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_reset_tokens_hash" ON "password_reset_tokens" ("tokenHash")`);

    // Backfill customers from the orders already in the system so reporting
    // has history from day one rather than starting empty.
    await queryRunner.query(`
      INSERT INTO "customers" ("email","name","company","phones","orderCount","lifetimeValuePesewas","firstOrderAt","lastOrderAt")
      SELECT lower("customerEmail"),
             (array_agg("customerName" ORDER BY "createdAt" DESC))[1],
             '',
             '[]',
             count(*)::int,
             coalesce(sum("totalPesewas"),0)::int,
             min("createdAt"),
             max("createdAt")
      FROM "orders"
      WHERE "customerEmail" <> ''
      GROUP BY lower("customerEmail")
      ON CONFLICT ("email") DO NOTHING`);

    await queryRunner.query(`
      UPDATE "orders" o SET "customerId" = c."id"
      FROM "customers" c
      WHERE lower(o."customerEmail") = c."email" AND o."customerId" = ''`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payslips"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payroll_runs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "attendance_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "employees"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "refundedBy"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "refundedAt"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "refundReason"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "refundedPesewas"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "customerId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customers"`);
  }
}
