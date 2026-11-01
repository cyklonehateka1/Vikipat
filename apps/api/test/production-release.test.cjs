const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { plainToInstance } = require('class-transformer');
const { validateSync } = require('class-validator');
const { releaseProductionJobs } = require('../dist/production-release');
const { Order, OrderItem, ProductionJob, ProductionJobActivity, OrderStatusHistory, NotificationOutbox, StoreSettings, ReleaseOverride } = require('../dist/entities');
const { ReleaseOrderDto } = require('../dist/dto');

function fixture({ source = 'online', paymentStatus = 'paid' } = {}) {
  const state = {
    order: { id: 'order', orderNumber: 'VP-TEST', source, paymentStatus, status: 'pending_review', requiresReview: false, customerName: 'Customer', customerEmail: '', customerPhone: '' },
    items: [{ id: 'item1', orderId: 'order', serviceCode: 'flexy-banner', name: 'Banner', quantity: 1, specification: '{}' }],
    jobs: [],
    activity: [],
    history: [],
    notifications: [],
    releaseOverrides: [],
  };
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
  ]);
  const manager = { connection: { options: { type: 'sqlite' } }, getRepository: (entity) => repos.get(entity) };
  return { manager, state };
}

test('a walk-in order with no payment recorded cannot be released without an override', async () => {
  const { manager, state } = fixture({ source: 'walk_in', paymentStatus: 'unpaid' });
  await assert.rejects(releaseProductionJobs(manager, 'order', 'staff'), /Payment must be recorded/);
  assert.equal(state.jobs.length, 0);
});

test('an override reason releases an unpaid order and records who and why', async () => {
  const { manager, state } = fixture({ source: 'walk_in', paymentStatus: 'unpaid' });
  await releaseProductionJobs(manager, 'order', 'supervisor@vikipat.com', { reason: 'Corporate account, invoiced monthly' });
  assert.equal(state.jobs.length > 0, true);
  assert.equal(state.releaseOverrides[0].reason, 'Corporate account, invoiced monthly');
  assert.equal(state.releaseOverrides[0].actorEmail, 'supervisor@vikipat.com');
});

test('a paid order releases with no override needed', async () => {
  const { manager, state } = fixture({ source: 'online', paymentStatus: 'paid' });
  await releaseProductionJobs(manager, 'order', 'staff');
  assert.equal(state.jobs.length > 0, true);
  assert.equal(state.releaseOverrides.length, 0);
});

test('a release override reason of only spaces is rejected by validation', () => {
  const errors = validateSync(plainToInstance(ReleaseOrderDto, { overrideReason: '          ' }));
  assert.ok(errors.some((e) => e.property === 'overrideReason'));
});
