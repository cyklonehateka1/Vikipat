const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { OrderService } = require('../dist/order.service');

function fixture() {
  const order = { id: 'order-1', orderNumber: 'VP-TEST0001', customerEmail: 'otp@example.test' };
  const rows = [];
  let seq = 0;
  const otps = {
    update: async (where, set) => {
      for (const r of rows) if (r.orderId === where.orderId && r.consumed === where.consumed) Object.assign(r, set);
    },
    create: (data) => ({ attempts: 0, consumed: false, ...data }),
    save: async (row) => {
      if (!row.id) { row.id = `otp-${seq++}`; row.createdAt = row.createdAt || new Date(Date.now() + seq); rows.push(row); }
      else { const idx = rows.findIndex((r) => r.id === row.id); rows[idx] = row; }
      return row;
    },
    findOne: async ({ where }) => rows.filter((r) => r.orderId === where.orderId && r.consumed === where.consumed)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0],
  };
  const orders = { findOneBy: async () => order };
  const notifications = { queueEmail: async () => {} };
  const jwt = { signAsync: async () => 'test-token' };
  const items = { findBy: async () => [] };
  const history = { find: async () => [] };
  const service = Object.create(OrderService.prototype);
  Object.assign(service, { orders, otps, notifications, jwt, items, history });
  return { service, order, rows };
}

test('exhausting OTP attempts cannot be reset by requesting a new OTP before expiry', async () => {
  const previousAllowDevOtp = process.env.ALLOW_DEV_OTP;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.ALLOW_DEV_OTP = 'true';
  process.env.NODE_ENV = 'development';
  try {
  const { service, order } = fixture();
  await service.requestOtp(order.orderNumber, order.customerEmail);
  for (let i = 0; i < 5; i++) {
    await assert.rejects(service.verifyOtp(order.orderNumber, order.customerEmail, '000000'));
  }
  // Attacker reissues a fresh OTP, hoping to reset the attempt counter.
  const reissued = await service.requestOtp(order.orderNumber, order.customerEmail);
  assert.ok(reissued.devOtp, 'test relies on devOtp to know the reissued code');
  // Even with the correct code from the brand-new, reissued OTP, verification must still
  // be locked out until the original OTP's expiry passes.
  await assert.rejects(
    service.verifyOtp(order.orderNumber, order.customerEmail, reissued.devOtp),
    /Invalid or expired verification code/,
  );
  } finally {
    if (previousAllowDevOtp === undefined) delete process.env.ALLOW_DEV_OTP; else process.env.ALLOW_DEV_OTP = previousAllowDevOtp;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousNodeEnv;
  }
});
