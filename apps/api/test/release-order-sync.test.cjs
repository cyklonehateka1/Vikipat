const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { ConflictException } = require('@nestjs/common');
const { OrderService } = require('../dist/order.service');
const { Order, OrderItem, ProductionJob, ProductionJobActivity, OrderStatusHistory, NotificationOutbox, StoreSettings, ReleaseOverride, SyncedCommand } = require('../dist/entities');

function fixture() {
  const state = {
    order: { id: 'order', orderNumber: 'VP-TEST', source: 'online', paymentStatus: 'paid', status: 'pending_review', requiresReview: false, customerName: 'Customer', customerEmail: '', customerPhone: '', version: 1 },
    items: [{ id: 'item1', orderId: 'order', serviceCode: 'flexy-banner', name: 'Banner', quantity: 1, specification: '{}' }],
    jobs: [],
    activity: [],
    history: [],
    notifications: [],
    releaseOverrides: [],
    commands: new Map(),
  };
  const orders = {
    manager: {
      transaction: async (fn) => {
        const repos = new Map([
          [Order, { findOne: async () => state.order, save: async (o) => { state.order = o; return o; } }],
          [OrderItem, { find: async () => state.items }],
          [ProductionJob, {
            find: async () => state.jobs,
            create: (data) => ({ ...data }),
            save: async (arr) => { const saved = arr.map((job, i) => ({ ...job, id: `job${state.jobs.length + i + 1}` })); state.jobs.push(...saved); return saved; },
          }],
          [ProductionJobActivity, {
            create: (data) => ({ ...data }),
            save: async (arr) => { const list = Array.isArray(arr) ? arr : [arr]; state.activity.push(...list); return arr; },
          }],
          [OrderStatusHistory, { save: async (data) => { state.history.push(data); return data; } }],
          [NotificationOutbox, {
            create: (data) => ({ ...data }),
            save: async (data) => { const saved = { ...data, id: `n${state.notifications.length + 1}` }; state.notifications.push(saved); return saved; },
          }],
          [StoreSettings, { find: async () => [] }],
          [ReleaseOverride, {
            create: (data) => ({ ...data }),
            save: async (data) => { state.releaseOverrides.push(data); return data; },
          }],
          [SyncedCommand, {
            findOne: async ({ where: { id } }) => state.commands.get(id) ?? null,
            save: async (row) => { state.commands.set(row.id, row); return row; },
          }],
        ]);
        return fn({ connection: { options: { type: 'sqlite' } }, getRepository: (entity) => repos.get(entity) });
      },
    },
  };
  const notifications = { deliverQueued: async () => {} };
  const service = new OrderService(null, null, orders, null, null, null, null, null, null, null, null, notifications);
  return { service, state };
}

test('releasing the same order twice with the same commandId only releases it once', async () => {
  const { service, state } = fixture();
  const sync = { commandId: 'cmd-1', deviceId: 'device-a', expectedVersion: 1 };
  const first = await service.releaseOrderToProduction('order', 'staff@vikipat.com', undefined, sync);
  const second = await service.releaseOrderToProduction('order', 'staff@vikipat.com', undefined, sync);
  assert.equal(state.jobs.length, 1);
  assert.deepEqual(first, second);
});

test('releasing with a stale expectedVersion is rejected and nothing changes', async () => {
  const { service, state } = fixture();
  const sync = { commandId: 'cmd-2', deviceId: 'device-a', expectedVersion: 2 };
  await assert.rejects(
    service.releaseOrderToProduction('order', 'staff@vikipat.com', undefined, sync),
    (err) => err instanceof ConflictException,
  );
  assert.equal(state.order.status, 'pending_review');
  assert.equal(state.jobs.length, 0);
});

test('releasing with a matching expectedVersion succeeds and bumps the version', async () => {
  const { service, state } = fixture();
  const sync = { commandId: 'cmd-3', deviceId: 'device-a', expectedVersion: 1 };
  const result = await service.releaseOrderToProduction('order', 'staff@vikipat.com', undefined, sync);
  assert.equal(result.version, 2);
  assert.equal(state.order.version, 2);
});
