const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { ConflictException } = require('@nestjs/common');
const { OrderService } = require('../dist/order.service');
const { Order, ProductionJob, ProductionJobActivity, MaterialConsumption, MaterialItem, OrderStatusHistory, SyncedCommand } = require('../dist/entities');

function fixture() {
  const state = {
    job: { id: 'job1', orderId: 'order1', orderItemId: 'item1', orderNumber: 'VP-TEST', jobNumber: 'JOB-1', customerName: 'Customer', serviceCode: 'flexy-banner', title: 'Banner', quantity: 1, stage: 'intake', priority: 'normal', assignedTo: '', dueDate: '', specification: '{}', internalNote: '', version: 1 },
    order: { id: 'order1', orderNumber: 'VP-TEST', status: 'pending_review', customerName: 'Customer', customerEmail: '' },
    activity: [],
    history: [],
    commands: new Map(),
  };
  const orders = {
    manager: {
      transaction: async (fn) => {
        const repos = new Map([
          [ProductionJob, { findOne: async () => ({ ...state.job }), save: async (job) => { state.job = job; return job; } }],
          [Order, { findOne: async () => ({ ...state.order }), save: async (order) => { state.order = order; return order; } }],
          [ProductionJobActivity, { save: async (data) => { state.activity.push(data); return data; } }],
          [MaterialConsumption, { existsBy: async () => true }],
          [MaterialItem, { existsBy: async () => false }],
          [OrderStatusHistory, { save: async (data) => { state.history.push(data); return data; } }],
          [SyncedCommand, {
            findOne: async ({ where: { id } }) => state.commands.get(id) ?? null,
            save: async (row) => { state.commands.set(row.id, row); return row; },
          }],
        ]);
        return fn({ connection: { options: { type: 'sqlite' } }, getRepository: (entity) => repos.get(entity) });
      },
    },
  };
  const notifications = { queueEmail: async () => {}, queueWhatsApp: async () => {} };
  const service = new OrderService(null, null, orders, null, null, orders, null, null, null, null, null, notifications);
  return { service, state };
}

test('moving a job to the same stage twice with the same commandId only applies once', async () => {
  const { service, state } = fixture();
  const dto = { stage: 'artwork_review', commandId: 'cmd-1', deviceId: 'device-a' };
  const first = await service.updateProductionJob('job1', dto, 'staff@vikipat.com', 'admin');
  const second = await service.updateProductionJob('job1', dto, 'staff@vikipat.com', 'admin');
  assert.equal(state.activity.length, 1);
  assert.deepEqual(first, second);
});

test('moving a job with a stale expectedVersion is rejected and the stage is unchanged', async () => {
  const { service, state } = fixture();
  const dto = { stage: 'artwork_review', expectedVersion: 2 };
  await assert.rejects(
    service.updateProductionJob('job1', dto, 'staff@vikipat.com', 'admin'),
    (err) => err instanceof ConflictException,
  );
  assert.equal(state.job.stage, 'intake');
  assert.equal(state.job.version, 1);
});

test('moving a job with a matching expectedVersion succeeds and bumps the version', async () => {
  const { service, state } = fixture();
  const dto = { stage: 'artwork_review', expectedVersion: 1 };
  const result = await service.updateProductionJob('job1', dto, 'staff@vikipat.com', 'admin');
  assert.equal(result.stage, 'artwork_review');
  assert.equal(result.version, 2);
  assert.equal(state.job.version, 2);
});
