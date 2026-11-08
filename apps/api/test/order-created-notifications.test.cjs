const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { OrderService } = require('../dist/order.service');
const { Product, Order, OrderItem, StockActivity, OrderStatusHistory } = require('../dist/entities');

// OrderService's constructor positional order (apps/api/src/order.service.ts):
// rules, estimates, orders, items, products, jobs, jobActivity, history, otps, outbox, jwt, notifications, payments, customers.
function fixture({ notifications }) {
  const state = { order: null, items: [], history: [] };
  let orderCounter = 0;
  const repos = new Map([
    [Product, {}],
    [Order, {
      create: (data) => ({ ...data }),
      save: async (o) => { const saved = { ...o, id: `order${++orderCounter}` }; state.order = saved; return saved; },
    }],
    [OrderItem, { create: (data) => ({ ...data }), save: async (arr) => { state.items.push(...arr); return arr; } }],
    [StockActivity, { create: (data) => data, save: async () => {} }],
    [OrderStatusHistory, { create: (data) => ({ ...data }), save: async (h) => { state.history.push(h); return h; } }],
  ]);
  const manager = { connection: { options: { type: 'sqlite' } }, getRepository: (entity) => repos.get(entity), query: async () => {} };
  const orders = { manager: { transaction: async (fn) => fn(manager) }, existsBy: async () => false, save: async (o) => o };
  const customers = { linkOrder: async () => 'cust1' };
  const service = new OrderService(null, null, orders, null, null, null, null, null, null, null, null, notifications, null, customers);
  return { service, state };
}

test('order creation queues both an email and a WhatsApp receipt', async () => {
  const sent = [];
  const notifications = { queueEmail: async (...a) => sent.push(['email', ...a]), queueWhatsApp: async (...a) => sent.push(['whatsapp', ...a]) };
  const { service } = fixture({ notifications });
  await service.createGuest({ customerName: 'Ama', customerEmail: 'a@b.com', customerPhone: '0244000000', items: [{ type: 'custom', name: 'Banner', quantity: 1, unitPricePesewas: 10000 }] }, 'walk_in');
  assert.deepEqual(sent.map((s) => s[0]).sort(), ['email', 'whatsapp']);
});

test('order creation still calls queueWhatsApp with no customerPhone, and does not throw', async () => {
  // NotificationService.queueWhatsApp already no-ops on an empty phone (see notification.service.ts);
  // this guards against OrderService growing its own duplicate, divergent check around the call.
  const { service } = fixture({ notifications: { queueEmail: async () => {}, queueWhatsApp: async () => {} } });
  await assert.doesNotReject(service.createGuest({ customerName: 'Ama', customerEmail: 'a@b.com', customerPhone: '', items: [{ type: 'custom', name: 'Banner', quantity: 1, unitPricePesewas: 10000 }] }, 'walk_in'));
});
