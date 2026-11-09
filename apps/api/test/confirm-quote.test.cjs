const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { CommerceService } = require('../dist/commerce.service');
const { Order, OrderItem, AuditLog, OrderStatusHistory } = require('../dist/entities');

function fixture({ requiresReview = true, items = [] } = {}) {
  const state = {
    order: { id: 'order-1', requiresReview, status: 'pending_review', paymentStatus: 'unpaid', subtotalPesewas: 0, designFeePesewas: 0, deliveryFeePesewas: 0, totalPesewas: 0 },
    items: items.map((i, idx) => ({ id: `item-${idx + 1}`, orderId: 'order-1', quantity: 1, unitPricePesewas: 0, totalPesewas: 0, ...i })),
    audit: [], history: [],
  };
  const db = {
    transaction: async (fn) => {
      const repos = new Map([
        [Order, { findOne: async () => state.order, save: async (o) => { Object.assign(state.order, o); return state.order; } }],
        [OrderItem, { findBy: async ({ orderId }) => state.items.filter((i) => i.orderId === orderId), save: async (i) => { const idx = state.items.findIndex((x) => x.id === i.id); state.items[idx] = i; return i; } }],
        [AuditLog, { save: async (a) => { state.audit.push(a); } }],
        [OrderStatusHistory, { save: async (h) => { state.history.push(h); } }],
      ]);
      return fn({ connection: { options: { type: 'sqlite' } }, getRepository: (entity) => repos.get(entity) });
    },
  };
  const service = new CommerceService(db, {});
  return { service, state };
}

test('confirming a quote sets the price, recomputes the total, and clears requiresReview', async () => {
  const { service, state } = fixture({ items: [{ id: 'item-1', quantity: 2 }] });
  const result = await service.confirmQuote('order-1', { reason: 'Agreed with customer on site visit', items: [{ id: 'item-1', unitPricePesewas: 50000 }] }, 'admin@vikipat.com');
  assert.equal(state.items[0].unitPricePesewas, 50000);
  assert.equal(state.items[0].totalPesewas, 100000); // quantity 2
  assert.equal(result.subtotalPesewas, 100000);
  assert.equal(result.totalPesewas, 100000);
  assert.equal(result.requiresReview, false);
  assert.equal(result.status, 'awaiting_payment');
  assert.equal(result.paymentStatus, 'pending');
  assert.equal(state.audit[0].action, 'quote_confirmed');
});

test('an order that is not awaiting review is rejected', async () => {
  const { service } = fixture({ requiresReview: false, items: [{ id: 'item-1' }] });
  await assert.rejects(
    service.confirmQuote('order-1', { reason: 'test', items: [{ id: 'item-1', unitPricePesewas: 1000 }] }, 'admin@vikipat.com'),
    /not awaiting a pricing review/,
  );
});

test('confirming only some of several custom items leaves the order still in review', async () => {
  const { service, state } = fixture({ items: [{ id: 'item-1' }, { id: 'item-2' }] });
  await assert.rejects(
    service.confirmQuote('order-1', { reason: 'test', items: [{ id: 'item-1', unitPricePesewas: 1000 }] }, 'admin@vikipat.com'),
    /Every item needs an agreed price/,
  );
  assert.equal(state.order.requiresReview, true); // transaction rolled back conceptually — flag untouched
});

test('an order that was cancelled while still flagged for review cannot be un-cancelled by confirming its price', async () => {
  const { service, state } = fixture({ items: [{ id: 'item-1' }] });
  state.order.status = 'cancelled'; // requiresReview stays true, but an admin already cancelled it
  await assert.rejects(
    service.confirmQuote('order-1', { reason: 'test', items: [{ id: 'item-1', unitPricePesewas: 1000 }] }, 'admin@vikipat.com'),
    /not awaiting a pricing review/,
  );
  assert.equal(state.order.status, 'cancelled'); // untouched
});

test('an item id that does not belong to this order is rejected, not silently skipped', async () => {
  const { service } = fixture({ items: [{ id: 'item-1' }] });
  await assert.rejects(
    service.confirmQuote('order-1', { reason: 'test', items: [{ id: 'not-this-order', unitPricePesewas: 1000 }] }, 'admin@vikipat.com'),
    /does not belong to this order/,
  );
});
