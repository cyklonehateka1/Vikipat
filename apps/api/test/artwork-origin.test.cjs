const { test, after } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { OrderService } = require('../dist/order.service');
const { Order, OrderItem, Product, StockActivity, OrderStatusHistory } = require('../dist/entities');

const previousApiPublicUrl = process.env.API_PUBLIC_URL;
process.env.API_PUBLIC_URL = 'http://localhost:3000';
after(() => { if (previousApiPublicUrl === undefined) delete process.env.API_PUBLIC_URL; else process.env.API_PUBLIC_URL = previousApiPublicUrl; });

function fixture() {
  const orderRepo = { create: (d) => ({ id: 'order-1', ...d }), save: async (o) => o, findOneBy: async () => undefined };
  const itemRepo = { create: (d) => d, save: async (items) => items };
  const historyRepo = { create: (d) => d, save: async (h) => h };
  const repos = new Map([
    [Order, orderRepo],
    [OrderItem, itemRepo],
    [Product, {}],
    [StockActivity, {}],
    [OrderStatusHistory, historyRepo],
  ]);
  const manager = { connection: { options: { type: 'sqlite' } }, getRepository: (entity) => repos.get(entity) };
  const orders = { manager: { transaction: (fn) => fn(manager) }, existsBy: async () => false };
  const customers = { linkOrder: async () => 'customer-1' };
  const notifications = { queueEmail: async () => {}, queueWhatsApp: async () => {} };
  const payments = { initializePaystack: async () => null };
  const service = Object.create(OrderService.prototype);
  Object.assign(service, { orders, customers, notifications, payments });
  return { service };
}

const body = {
  customerName: 'Artwork Tester',
  customerEmail: 'artwork@example.test',
  customerPhone: '0241234567',
  source: 'walk_in',
  items: [{ type: 'custom', name: 'Custom banner', quantity: 1, unitPricePesewas: 5000 }],
};

test('order creation rejects an artwork URL outside this app\'s own /uploads/ path', async () => {
  const { service } = fixture();
  const dto = { ...body, items: [{ ...body.items[0], artworkUrl: 'https://evil.example.test/uploads/x.pdf' }] };
  await assert.rejects(service.createGuest(dto, 'walk_in'), /Invalid artwork URL/);
});

test('order creation accepts an artwork URL on this app\'s own /uploads/ path', async () => {
  const { service } = fixture();
  const dto = { ...body, items: [{ ...body.items[0], artworkUrl: 'http://localhost:3000/uploads/x.pdf' }] };
  const result = await service.createGuest(dto, 'walk_in');
  assert.ok(result.orderNumber);
});
