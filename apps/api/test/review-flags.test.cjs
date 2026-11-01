const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { OrderService } = require('../dist/order.service');

// OrderService's constructor positional order (apps/api/src/order.service.ts):
// rules, estimates, orders, items, products, jobs, jobActivity, history, otps, outbox,
// jwt, notifications, payments, customers, refunds, attendance (the last two added by Task 7).
function fixture({ items = [], orders = [], history = [], activity = [], attendance = [], refunds = [], jobs = [] } = {}) {
  const ordersRepo = {
    find: async ({ where } = {}) => orders.filter((o) => !where?.status || o.status === where.status),
  };
  const itemsRepo = { find: async ({ where } = {}) => items.filter((i) => !where?.kind || i.kind === where.kind) };
  const historyRepo = { find: async ({ where } = {}) => history.filter((h) => !where?.orderId || h.orderId === where.orderId) };
  const jobActivityRepo = { find: async ({ where } = {}) => activity.filter((a) => !where?.type || a.type === where.type) };
  const jobsRepo = { find: async () => jobs };
  const refundsRepo = { find: async () => refunds };
  const attendanceRepo = { find: async () => attendance };
  const service = new OrderService(null, null, ordersRepo, itemsRepo, null, jobsRepo, jobActivityRepo, historyRepo, null, null, null, null, null, null, refundsRepo, attendanceRepo);
  return { service };
}

test('custom-priced order items are listed with their order context', async () => {
  const { service } = fixture({
    items: [{ orderId: 'o1', kind: 'custom', name: 'Banner', quantity: 2, unitPricePesewas: 5000, totalPesewas: 10000 }],
    orders: [{ id: 'o1', orderNumber: 'VP-1', customerName: 'Ama', createdAt: new Date('2026-10-20') }],
  });
  const flags = await service.flagCustomPricedItems();
  assert.equal(flags.length, 1);
  assert.equal(flags[0].orderNumber, 'VP-1');
});

test('non-custom order items are not flagged', async () => {
  const { service } = fixture({
    items: [{ orderId: 'o1', kind: 'large_format', name: 'Banner', quantity: 2, unitPricePesewas: 5000, totalPesewas: 10000 }],
    orders: [{ id: 'o1', orderNumber: 'VP-1', customerName: 'Ama', createdAt: new Date() }],
  });
  assert.deepEqual(await service.flagCustomPricedItems(), []);
});

const atHistory = (statuses, orderId = 'o1') => statuses.map((status, i) => ({ orderId, status, createdAt: new Date(Date.UTC(2026, 9, 20, 9 + i, 0, 0)) }));

test('an order cancelled before ever reaching production is not flagged', async () => {
  const { service } = fixture({
    orders: [{ id: 'o1', orderNumber: 'VP-1', customerName: 'Ama', status: 'cancelled' }],
    history: atHistory(['pending_review', 'cancelled']),
  });
  assert.deepEqual(await service.flagLateCancellations(), []);
});

test('an order cancelled after reaching in_production is flagged', async () => {
  const { service } = fixture({
    orders: [{ id: 'o1', orderNumber: 'VP-1', customerName: 'Ama', status: 'cancelled' }],
    history: atHistory(['paid', 'in_production', 'cancelled']),
  });
  const flags = await service.flagLateCancellations();
  assert.equal(flags.length, 1);
  assert.equal(flags[0].reachedStage, 'in_production');
});

test('a stage-change activity with nobody clocked in is flagged as unattended', async () => {
  const { service } = fixture({ activity: [{ type: 'stage_change', createdAt: new Date('2026-10-30T10:00:00Z') }], attendance: [] });
  const flags = await service.flagUnattendedJobs('2026-10-30');
  assert.equal(flags.length, 1);
});

test('a stage-change activity during a clocked-in shift is not flagged', async () => {
  const { service } = fixture({
    activity: [{ type: 'stage_change', createdAt: new Date('2026-10-30T10:00:00Z') }],
    attendance: [{ clockIn: new Date('2026-10-30T08:00:00Z'), clockOut: null }],
  });
  assert.deepEqual(await service.flagUnattendedJobs('2026-10-30'), []);
});

test('an invalid date string is rejected with a clean error', async () => {
  const { service } = fixture();
  await assert.rejects(service.flagUnattendedJobs('not-a-date'), /valid calendar date/i);
});

test('ordersCreatedOn counts orders by source without a dialect-specific query (works against SQLite dev, not just Postgres)', async () => {
  const { service } = fixture({
    orders: [
      { id: 'o1', source: 'walk_in', createdAt: new Date('2026-10-30T09:00:00Z') },
      { id: 'o2', source: 'online', createdAt: new Date('2026-10-30T09:00:00Z') },
      { id: 'o3', source: 'online', createdAt: new Date('2026-10-30T09:00:00Z') },
    ],
  });
  const result = await service.ordersCreatedOn('2026-10-30');
  assert.equal(result.count, 3);
  assert.deepEqual(result.bySource, { online: 2, walk_in: 1, salesperson: 0 });
});

test('a custom-priced item created during the "to" day is included, not excluded by an end-of-day cutoff', async () => {
  const { service } = fixture({
    items: [{ orderId: 'o1', kind: 'custom', name: 'Banner', quantity: 1, unitPricePesewas: 5000, totalPesewas: 5000 }],
    orders: [{ id: 'o1', orderNumber: 'VP-1', customerName: 'Ama', createdAt: new Date('2026-10-20T18:00:00Z') }],
  });
  const flags = await service.flagCustomPricedItems('2026-10-01', '2026-10-20');
  assert.equal(flags.length, 1);
});

test('a late cancellation triggered during the "to" day is included, not excluded by an end-of-day cutoff', async () => {
  const { service } = fixture({
    orders: [{ id: 'o1', orderNumber: 'VP-1', customerName: 'Ama', status: 'cancelled' }],
    history: ['paid', 'in_production', 'cancelled'].map((status, i) => ({ orderId: 'o1', status, createdAt: new Date(Date.UTC(2026, 9, 20, 18 + i, 0, 0)) })),
  });
  const flags = await service.flagLateCancellations('2026-10-01', '2026-10-20');
  assert.equal(flags.length, 1);
});
