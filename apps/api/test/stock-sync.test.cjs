const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { ConflictException, BadRequestException } = require('@nestjs/common');
const { MaterialService } = require('../dist/material.service');
const { MaterialItem, MaterialStockActivity, MaterialPhysicalCount, Product, StockActivity, ProductionJob, MaterialConsumption, SyncedCommand } = require('../dist/entities');

function fixture(material = {}) {
  const state = {
    material: { id: 'mat-1', name: 'Vinyl', unit: 'sqft', stockQuantity: 10, lowStockThreshold: 5, tolerancePercent: 90, version: 1, ...material },
    stocks: [],
    counts: [],
    commands: new Map(),
  };
  const materialRepo = {
    findOneBy: async (where) => (state.material.id === where.id ? { ...state.material } : null),
    save: async (m) => { Object.assign(state.material, m); return { ...state.material }; },
  };
  const stockRepo = { create: (d) => ({ ...d }), save: async (d) => { state.stocks.push(d); return d; } };
  const countRepo = { create: (d) => ({ ...d }), save: async (d) => { state.counts.push(d); return d; } };
  const syncedCommands = {
    findOne: async ({ where: { id } }) => state.commands.get(id) ?? null,
    save: async (row) => { state.commands.set(row.id, row); return row; },
  };
  const audit = { save: async () => {} };
  const repos = new Map([
    [MaterialItem, { findOne: async ({ where }) => (state.material.id === where.id ? { ...state.material } : null), save: async (m) => { Object.assign(state.material, m); return { ...state.material }; } }],
    [MaterialStockActivity, stockRepo],
    [MaterialPhysicalCount, countRepo],
    [Product, { findOne: async () => null, save: async (p) => p }],
    [StockActivity, stockRepo],
    [SyncedCommand, syncedCommands],
  ]);
  materialRepo.manager = {
    transaction: async (fn) => fn({ connection: { options: { type: 'sqlite' } }, getRepository: (entity) => repos.get(entity) }),
  };
  const auth = { audit: async () => {} };
  const service = new MaterialService(materialRepo, stockRepo, auth, { find: async () => [] }, { find: async () => [] }, { findOne: async () => null }, countRepo);
  return { service, state };
}

test('a delta adjustment of +5 on a stock of 10 results in 15', async () => {
  const { service, state } = fixture({ stockQuantity: 10 });
  const result = await service.adjust('mat-1', { stockQuantity: 5, reason: 'Restock', delta: true }, 'admin@vikipat.com');
  assert.equal(result.stockQuantity, 15);
  assert.equal(state.material.stockQuantity, 15);
  assert.equal(state.material.version, 2);
});

test('a delta adjustment that would take stock below zero is rejected', async () => {
  const { service, state } = fixture({ stockQuantity: 10 });
  await assert.rejects(
    service.adjust('mat-1', { stockQuantity: -15, reason: 'Usage', delta: true }, 'admin@vikipat.com'),
    (err) => err instanceof BadRequestException,
  );
  assert.equal(state.material.stockQuantity, 10);
  assert.equal(state.material.version, 1);
});

test('two delta adjustments with different commandIds from different devices both apply, additively', async () => {
  const { service, state } = fixture({ stockQuantity: 10 });
  await service.adjust('mat-1', { stockQuantity: 3, reason: 'Delta A', delta: true, commandId: 'cmd-a', deviceId: 'device-1' }, 'admin@vikipat.com');
  await service.adjust('mat-1', { stockQuantity: 4, reason: 'Delta B', delta: true, commandId: 'cmd-b', deviceId: 'device-2' }, 'admin@vikipat.com');
  assert.equal(state.material.stockQuantity, 17);
  assert.equal(state.material.version, 3);
});

test('a repeated delta adjustment with the same commandId only applies once', async () => {
  const { service, state } = fixture({ stockQuantity: 10 });
  const dto = { stockQuantity: 5, reason: 'Delta', delta: true, commandId: 'cmd-1', deviceId: 'device-1' };
  const first = await service.adjust('mat-1', dto, 'admin@vikipat.com');
  const second = await service.adjust('mat-1', dto, 'admin@vikipat.com');
  assert.deepEqual(first, second);
  assert.equal(state.material.stockQuantity, 15);
  assert.equal(state.material.version, 2);
  assert.equal(state.stocks.length, 1);
});

test('a physical count with a stale expectedVersion is rejected', async () => {
  const { service, state } = fixture({ stockQuantity: 10, version: 2 });
  await assert.rejects(
    service.recordPhysicalCount('material_item', 'mat-1', 8, 'admin@vikipat.com', undefined, { commandId: undefined, deviceId: undefined, expectedVersion: 1 }),
    (err) => err instanceof ConflictException,
  );
  assert.equal(state.material.stockQuantity, 10);
  assert.equal(state.material.version, 2);
});

test('an absolute (non-delta) adjustment still behaves exactly as before', async () => {
  const { service, state } = fixture({ stockQuantity: 10 });
  const result = await service.adjust('mat-1', { stockQuantity: 25, reason: 'Recount' }, 'admin@vikipat.com');
  assert.equal(result.stockQuantity, 25);
  assert.equal(state.material.stockQuantity, 25);
  assert.equal(state.material.version, 2);
});
