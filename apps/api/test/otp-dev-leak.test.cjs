const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { OrderService } = require('../dist/order.service');

function fixture() {
  const order = { id: 'order-1', orderNumber: 'VP-TEST0002', customerEmail: 'devleak@example.test' };
  const rows = [];
  let seq = 0;
  const otps = {
    update: async () => {},
    create: (data) => ({ attempts: 0, consumed: false, ...data }),
    save: async (row) => { row.id = row.id || `otp-${seq++}`; rows.push(row); return row; },
    findOne: async () => undefined,
  };
  const orders = { findOneBy: async () => order };
  const notifications = { queueEmail: async () => {} };
  const service = Object.create(OrderService.prototype);
  Object.assign(service, { orders, otps, notifications });
  return { service, order };
}

const envNames = ['NODE_ENV', 'ALLOW_DEV_OTP'];
const original = Object.fromEntries(envNames.map((k) => [k, process.env[k]]));
function restoreEnv() {
  for (const name of envNames) {
    if (original[name] === undefined) delete process.env[name]; else process.env[name] = original[name];
  }
}

test('devOtp is absent when NODE_ENV is unset, even though it is not "production"', async () => {
  delete process.env.NODE_ENV;
  delete process.env.ALLOW_DEV_OTP;
  try {
    const { service, order } = fixture();
    const result = await service.requestOtp(order.orderNumber, order.customerEmail);
    assert.equal(result.devOtp, undefined);
  } finally { restoreEnv(); }
});

test('devOtp is absent when NODE_ENV is some other non-production value and ALLOW_DEV_OTP is not set', async () => {
  process.env.NODE_ENV = 'staging';
  delete process.env.ALLOW_DEV_OTP;
  try {
    const { service, order } = fixture();
    const result = await service.requestOtp(order.orderNumber, order.customerEmail);
    assert.equal(result.devOtp, undefined);
  } finally { restoreEnv(); }
});

test('devOtp is present only when NODE_ENV is non-production AND ALLOW_DEV_OTP is explicitly "true"', async () => {
  process.env.NODE_ENV = 'development';
  process.env.ALLOW_DEV_OTP = 'true';
  try {
    const { service, order } = fixture();
    const result = await service.requestOtp(order.orderNumber, order.customerEmail);
    assert.equal(typeof result.devOtp, 'string');
  } finally { restoreEnv(); }
});

test('devOtp stays absent in production even if ALLOW_DEV_OTP is set to "true"', async () => {
  process.env.NODE_ENV = 'production';
  process.env.ALLOW_DEV_OTP = 'true';
  try {
    const { service, order } = fixture();
    const result = await service.requestOtp(order.orderNumber, order.customerEmail);
    assert.equal(result.devOtp, undefined);
  } finally { restoreEnv(); }
});
