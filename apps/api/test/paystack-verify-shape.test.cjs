const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { PaymentService } = require('../dist/payment.service');

const previousSecret = process.env.PAYSTACK_SECRET_KEY;
process.env.PAYSTACK_SECRET_KEY = 'test-only-placeholder';

function mockFetch(t, paystackData) {
  t.mock.method(global, 'fetch', async () => ({
    ok: true,
    json: async () => ({ status: true, data: paystackData }),
  }));
}

test('an unsuccessful Paystack reference returns only a generic status, no raw Paystack fields', async (t) => {
  mockFetch(t, {
    status: 'abandoned',
    id: 998877,
    gateway_response: 'Declined by card issuer',
    customer: { email: 'someone@example.test' },
    authorization: { last4: '1234', bin: '539983' },
  });
  const service = new PaymentService({}, {});
  const result = await service.verifyPaystackReference('some-reference');
  assert.deepEqual(Object.keys(result).sort(), ['paid', 'received', 'reference', 'status']);
  assert.equal(result.status, 'failed');
  assert.equal(result.paid, false);
  assert.ok(!('id' in result));
  assert.ok(!('gateway_response' in result));
  assert.ok(!('customer' in result));
  assert.ok(!('authorization' in result));
});

test('a pending Paystack reference is reported as pending, not the raw Paystack status string', async (t) => {
  mockFetch(t, { status: 'ongoing', id: 1 });
  const service = new PaymentService({}, {});
  const result = await service.verifyPaystackReference('some-reference');
  assert.equal(result.status, 'pending');
  assert.ok(!('id' in result));
});

test.after(() => {
  if (previousSecret === undefined) delete process.env.PAYSTACK_SECRET_KEY; else process.env.PAYSTACK_SECRET_KEY = previousSecret;
});
