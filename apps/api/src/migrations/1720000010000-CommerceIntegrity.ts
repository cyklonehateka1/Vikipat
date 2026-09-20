import { MigrationInterface, QueryRunner } from 'typeorm';
export class CommerceIntegrity1720000010000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`ALTER TABLE payroll_runs ADD COLUMN "policySnapshot" text NOT NULL DEFAULT '{}'`);
    await q.query(`ALTER TABLE orders ADD COLUMN "requestKey" varchar UNIQUE, ADD COLUMN salesperson varchar NOT NULL DEFAULT '', ADD COLUMN "deliveryFeePesewas" integer NOT NULL DEFAULT 0`);
    await q.query(`ALTER TABLE payment_transactions ADD COLUMN "paidAt" timestamptz, ADD COLUMN "recordedBy" varchar NOT NULL DEFAULT '', ADD COLUMN "externalReference" varchar NOT NULL DEFAULT ''`);
    // Historical receipt dates are approximations, explicitly disclosed in reporting.
    await q.query(`UPDATE payment_transactions SET "paidAt"="updatedAt" WHERE status IN ('paid','refunded')`);
    await q.query(`CREATE TABLE order_refunds (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "orderId" varchar NOT NULL, "requestKey" varchar NOT NULL UNIQUE, "amountPesewas" integer NOT NULL CHECK ("amountPesewas">0), method varchar NOT NULL, "externalReference" varchar NOT NULL, reason text NOT NULL, "recordedBy" varchar NOT NULL, "occurredAt" timestamptz NOT NULL, "policySnapshot" text NOT NULL, "cancelRemainingWork" boolean NOT NULL DEFAULT false, "createdAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE INDEX ON order_refunds ("orderId")`);
    await q.query(`INSERT INTO order_refunds ("orderId","requestKey","amountPesewas",method,"externalReference",reason,"recordedBy","occurredAt","policySnapshot") SELECT id::text,'legacy-'||id::text,"refundedPesewas",'legacy','',"refundReason","refundedBy",coalesce("refundedAt","updatedAt"),'Historical aggregate; individual refund dates unavailable' FROM orders WHERE "refundedPesewas">0`);
    await q.query(`UPDATE orders SET "paymentStatus"='part_refunded' WHERE "refundedPesewas">0 AND "refundedPesewas"<"totalPesewas"`);
    await q.query(`CREATE TABLE business_policies (id varchar PRIMARY KEY, value text NOT NULL, "updatedAt" timestamptz NOT NULL DEFAULT now())`);
  }
  async down(q: QueryRunner) {
    await q.query(`ALTER TABLE payroll_runs DROP COLUMN "policySnapshot"`);
    await q.query('DROP TABLE business_policies'); await q.query('DROP TABLE order_refunds');
    await q.query(`ALTER TABLE payment_transactions DROP COLUMN "paidAt", DROP COLUMN "recordedBy", DROP COLUMN "externalReference"`);
    await q.query(`ALTER TABLE orders DROP COLUMN "requestKey", DROP COLUMN salesperson, DROP COLUMN "deliveryFeePesewas"`);
  }
}
