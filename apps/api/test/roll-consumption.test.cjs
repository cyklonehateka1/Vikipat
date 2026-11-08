const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { computeRollConsumption } = require('../dist/roll-consumption');
const { MaterialItem, MaterialConsumption, MaterialStockActivity } = require('../dist/entities');

function fixture({ rolls = [] } = {}) {
  const state = { rolls: rolls.map((r, i) => ({ id: `m${i + 1}`, ...r })), consumption: [], stockActivity: [] };
  const manager = {
    connection: { options: { type: 'sqlite' } },
    getRepository: (entity) => {
      if (entity === MaterialItem) return {
        find: async ({ where }) => state.rolls.filter((r) => r.kind === where.kind && r.serviceCode === where.serviceCode),
        save: async (r) => { const i = state.rolls.findIndex((x) => x.id === r.id); state.rolls[i] = r; return r; },
      };
      if (entity === MaterialConsumption) return { create: (d) => ({ ...d }), save: async (d) => { state.consumption.push(d); return d; } };
      if (entity === MaterialStockActivity) return { create: (d) => ({ ...d }), save: async (d) => { state.stockActivity.push(d); return d; } };
    },
  };
  return { manager, state };
}
const job = (overrides) => ({ id: 'job1', jobNumber: 'VP-TEST-J01', serviceCode: 'flexy-banner', specification: JSON.stringify({ width: 6, height: 3, unit: 'ft', totalAreaSqFt: 18 }), ...overrides });

test('draws the smallest roll width that fits and has stock, length computed from area', async () => {
  const { manager, state } = fixture({ rolls: [
    { kind: 'roll', serviceCode: 'flexy-banner', name: 'Flexy 5ft', rollWidthMetres: 1.524, stockQuantity: 50 },
    { kind: 'roll', serviceCode: 'flexy-banner', name: 'Flexy 7ft', rollWidthMetres: 2.1336, stockQuantity: 50 },
  ] });
  const result = await computeRollConsumption(manager, job(), 'operator@vikipat.com');
  assert.ok(result);
  assert.equal(state.rolls[0].name, 'Flexy 5ft'); // the 5ft roll was drawn, not the 7ft
  assert.ok(state.rolls[0].stockQuantity < 50);
});

test('a roll whose width in metres exactly equals the job dimension in feet is not skipped on float error', async () => {
  // 3ft * 0.3048 === 0.9144000000000001 in JS float arithmetic, not 0.9144 —
  // an unguarded "<" comparison treats the exact-fit roll as too narrow and
  // silently falls back to the next wider one.
  const { manager, state } = fixture({ rolls: [
    { kind: 'roll', serviceCode: 'flexy-banner', name: 'Flexy 3ft', rollWidthMetres: 0.9144, stockQuantity: 50 },
    { kind: 'roll', serviceCode: 'flexy-banner', name: 'Flexy 5ft', rollWidthMetres: 1.524, stockQuantity: 50 },
  ] });
  const result = await computeRollConsumption(manager, job({ specification: JSON.stringify({ width: 6, height: 3, unit: 'ft', totalAreaSqFt: 18 }) }), 'operator@vikipat.com');
  assert.ok(result);
  assert.equal(state.rolls[0].name, 'Flexy 3ft'); // the exact-width roll was drawn, not the 5ft
  assert.ok(state.rolls[0].stockQuantity < 50);
  assert.equal(state.rolls[1].stockQuantity, 50); // 5ft untouched
});

test('falls back to the next wider roll when the right-sized one has run out', async () => {
  const { manager, state } = fixture({ rolls: [
    { kind: 'roll', serviceCode: 'flexy-banner', name: 'Flexy 5ft', rollWidthMetres: 1.524, stockQuantity: 0.1 },
    { kind: 'roll', serviceCode: 'flexy-banner', name: 'Flexy 7ft', rollWidthMetres: 2.1336, stockQuantity: 50 },
  ] });
  await computeRollConsumption(manager, job(), 'operator@vikipat.com');
  assert.equal(state.rolls[0].stockQuantity, 0.1); // untouched
  assert.ok(state.rolls[1].stockQuantity < 50); // the 7ft roll was drawn instead
});

test('no roll wide enough, or none with enough stock anywhere, returns null and touches nothing', async () => {
  const { manager, state } = fixture({ rolls: [{ kind: 'roll', serviceCode: 'flexy-banner', name: 'Flexy 5ft', rollWidthMetres: 1.524, stockQuantity: 0 }] });
  const result = await computeRollConsumption(manager, job(), 'operator@vikipat.com');
  assert.equal(result, null);
  assert.equal(state.consumption.length, 0);
  assert.equal(state.rolls[0].stockQuantity, 0);
});

test('a job with no dimensions on its specification returns null', async () => {
  const { manager } = fixture({ rolls: [{ kind: 'roll', serviceCode: 'flexy-banner', rollWidthMetres: 1.524, stockQuantity: 50 }] });
  const result = await computeRollConsumption(manager, job({ specification: '{}' }), 'operator@vikipat.com');
  assert.equal(result, null);
});

const { OrderService } = require('../dist/order.service');
const { ProductionJob, ProductionJobActivity, Order, OrderStatusHistory, MaterialConsumption: MC, MaterialItem: MI } = require('../dist/entities');

function jobFixture({ existingConsumption = false, rolls = [] } = {}) {
  const state = {
    job: { id: 'job', orderId: 'order', jobNumber: 'VP-J1', stage: 'production_ready', internalNote: '', assignedTo: '', serviceCode: 'flexy-banner', specification: JSON.stringify({ width: 6, height: 3, unit: 'ft', totalAreaSqFt: 18 }) },
    order: { id: 'order', orderNumber: 'VP', customerName: 'Customer', status: 'ready_for_production' },
    activity: [], history: [], rolls: rolls.map((r, i) => ({ id: `m${i + 1}`, ...r })), consumption: existingConsumption ? [{ jobId: 'job' }] : [],
  };
  const jobs = { manager: { connection: { options: { type: 'sqlite' } }, transaction: async (fn) => {
    const repositories = new Map([
      [ProductionJob, { findOne: async () => state.job, save: async (j) => { Object.assign(state.job, j); return state.job; } }],
      [Order, { findOne: async () => state.order, save: async (o) => { Object.assign(state.order, o); return state.order; } }],
      [ProductionJobActivity, { save: async (a) => { state.activity.push(a); } }],
      [OrderStatusHistory, { save: async (h) => { state.history.push(h); } }],
      [MC, {
        existsBy: async ({ jobId }) => state.consumption.some((c) => c.jobId === jobId),
        create: (d) => ({ ...d }),
        save: async (d) => { state.consumption.push(d); return d; },
      }],
      [MI, {
        find: async ({ where }) => state.rolls.filter((r) => r.kind === where.kind && r.serviceCode === where.serviceCode),
        existsBy: async ({ kind, serviceCode }) => state.rolls.some((r) => r.kind === kind && r.serviceCode === serviceCode),
        save: async (r) => { const i = state.rolls.findIndex((x) => x.id === r.id); state.rolls[i] = r; return r; },
      }],
    ]);
    return fn({ connection: { options: { type: 'sqlite' } }, getRepository: (entity) => repositories.get(entity) });
  } } };
  const notify = async () => {};
  const service = new OrderService(null, null, null, null, null, jobs, null, null, null, null, null, { queueEmail: notify, queueWhatsApp: notify }, null, null, null, null);
  return { service, state };
}

test('a job already carrying a consumption row is not drawn from again on a second in_production entry', async () => {
  const { service, state } = jobFixture({ existingConsumption: true });
  await service.updateProductionJob('job', { stage: 'in_production' }, 'staff', 'admin');
  assert.equal(state.job.stage, 'in_production');
  assert.equal(state.consumption.length, 1); // unchanged — no new row was added
});

test('a roll exists for the service but none fits in stock: the activity note flags it instead of silently skipping', async () => {
  const { service, state } = jobFixture({ rolls: [{ kind: 'roll', serviceCode: 'flexy-banner', name: 'Flexy 5ft', rollWidthMetres: 1.524, stockQuantity: 0 }] });
  await service.updateProductionJob('job', { stage: 'in_production' }, 'staff', 'admin');
  assert.equal(state.consumption.length, 0);
  assert.match(state.activity[0].note, /log material use manually/);
});

test('no roll material is configured for the service at all: no false flag is raised', async () => {
  const { service, state } = jobFixture({ rolls: [] });
  await service.updateProductionJob('job', { stage: 'in_production' }, 'staff', 'admin');
  assert.equal(state.activity[0].note, '');
});

const { allowedProductionStages } = require('../dist/production-workflow');

test('the stage workflow cannot skip past in_production — every non-cancel path to quality_check/ready/fulfilled passes through it', () => {
  assert.ok(!allowedProductionStages('production_ready').includes('quality_check'));
  assert.ok(!allowedProductionStages('production_ready').includes('ready'));
  assert.ok(!allowedProductionStages('production_ready').includes('fulfilled'));
  assert.ok(!allowedProductionStages('artwork_review').includes('in_production'));
  assert.ok(!allowedProductionStages('proofing').includes('in_production'));
});
