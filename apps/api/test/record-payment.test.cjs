const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { CommerceService, RecordPaymentDto, RecordRefundDto } = require('../dist/commerce.service');
const { Order, PaymentTransaction, AuditLog, OrderStatusHistory, NotificationOutbox } = require('../dist/entities');

function fixture({ totalPesewas = 100000, payments = [] } = {}) {
  const state = {
    order: { id: 'order-1', orderNumber: 'VP-1', requiresReview: false, status: 'awaiting_payment', paymentStatus: 'pending', totalPesewas, refundedPesewas: 0, customerEmail: '' },
    payments: payments.map((p, i) => ({ id: `pay-${i}`, orderId: 'order-1', status: 'paid', reference: `MANUAL-${i}`, ...p })),
    audit: [], history: [],
  };
  const db = {
    transaction: async (fn) => {
      const repos = new Map([
        [Order, { findOne: async () => state.order, save: async (o) => Object.assign(state.order, o) }],
        [PaymentTransaction, {
          findOneBy: async ({ reference }) => state.payments.find((p) => p.reference === reference) || null,
          findBy: async ({ orderId }) => state.payments.filter((p) => p.orderId === orderId),
          save: async (p) => { const row = { id: `pay-${state.payments.length}`, ...p }; state.payments.push(row); return row; },
        }],
        [AuditLog, { save: async (a) => { state.audit.push(a); } }],
        [OrderStatusHistory, { save: async (h) => { state.history.push(h); } }],
        [NotificationOutbox, { save: async () => {} }],
      ]);
      return fn({ connection: { options: { type: 'sqlite' } }, getRepository: (entity) => repos.get(entity) });
    },
  };
  return { service: new CommerceService(db, {}), state };
}

let keys = 0;
const dto = (amountPesewas, method = 'cash') => ({
  requestKey: `00000000-0000-4000-8000-${String(++keys).padStart(12, '0')}`,
  amountPesewas, method, externalReference: 'ref', occurredAt: new Date(Date.now() - 1000).toISOString(),
});

test('cheque is an accepted payment and refund method', async () => {
  assert.deepEqual(await validate(plainToInstance(RecordPaymentDto, dto(1000, 'cheque'))), []);
  assert.deepEqual(await validate(plainToInstance(RecordRefundDto, { ...dto(1000, 'cheque'), reason: 'Overpaid', cancelRemainingWork: false, confirmedExternalPayment: true })), []);
});

test('a cheque payment is recorded with provider cheque', async () => {
  const { service, state } = fixture();
  const payment = await service.payment('order-1', dto(100000, 'cheque'), 'admin@vikipat.com');
  assert.equal(payment.provider, 'cheque');
  assert.equal(state.order.paymentStatus, 'paid');
});

test('a payment that settles the order in full is accepted', async () => {
  const { service, state } = fixture({ totalPesewas: 100000 });
  await service.payment('order-1', dto(100000), 'admin@vikipat.com');
  assert.equal(state.order.paymentStatus, 'paid');
});

test('a partial payment leaving the order under 70% paid is rejected', async () => {
  const { service, state } = fixture({ totalPesewas: 100000 });
  await assert.rejects(service.payment('order-1', dto(69999), 'admin@vikipat.com'), /at least 70% paid/);
  assert.equal(state.payments.length, 0);
});

test('a partial payment reaching 70% or more is accepted', async () => {
  const { service, state } = fixture({ totalPesewas: 100000 });
  await service.payment('order-1', dto(70000), 'admin@vikipat.com');
  assert.equal(state.order.paymentStatus, 'part_paid');
});

test('a second payment that takes the combined total past 70% is accepted', async () => {
  const { service, state } = fixture({ totalPesewas: 100000, payments: [{ amountPesewas: 40000, provider: 'cash' }] });
  await service.payment('order-1', dto(35000), 'admin@vikipat.com');
  assert.equal(state.payments.length, 2);
  assert.equal(state.order.paymentStatus, 'part_paid');
});
