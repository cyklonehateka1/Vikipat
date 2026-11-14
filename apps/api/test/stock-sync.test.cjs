const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { ConflictException, BadRequestException } = require('@nestjs/common');
const { validate } = require('class-validator');
const { plainToInstance } = require('class-transformer');
const { MaterialService } = require('../dist/material.service');
const { AdjustStockDto, AdjustMaterialStockDto } = require('../dist/dto');
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

test('an absolute (non-delta) negative stock adjustment is rejected at the DTO layer, before touching the DB', async () => {
  const productDto = plainToInstance(AdjustStockDto, { stock: -5, reason: 'Bad request' });
  const productErrors = await validate(productDto);
  assert.ok(productErrors.length >= 1, 'expected a validation error for negative absolute product stock');
  assert.ok(productErrors.some((e) => Array.isArray(Object.values(e.constraints || {})) && Object.values(e.constraints || {}).some((m) => /must not be less than 0/.test(m))));

  const materialDto = plainToInstance(AdjustMaterialStockDto, { stockQuantity: -5, reason: 'Bad request' });
  const materialErrors = await validate(materialDto);
  assert.ok(materialErrors.length >= 1, 'expected a validation error for negative absolute material stock');
  assert.ok(materialErrors.some((e) => Object.values(e.constraints || {}).some((m) => /must not be less than 0/.test(m))));

  // a delta adjustment with a negative value must pass DTO validation (it's legitimate),
  // and only be rejected once the service computes the resulting quantity.
  const deltaDto = plainToInstance(AdjustMaterialStockDto, { stockQuantity: -5, reason: 'Usage', delta: true });
  const deltaErrors = await validate(deltaDto);
  assert.equal(deltaErrors.length, 0, 'a negative delta must not be rejected at the DTO layer');
});

test('a delta adjustment that would go negative is rejected by the service, not the DTO layer', async () => {
  const { service, state } = fixture({ stockQuantity: 3 });
  await assert.rejects(
    service.adjust('mat-1', { stockQuantity: -5, reason: 'Usage', delta: true }, 'admin@vikipat.com'),
    (err) => err instanceof BadRequestException,
  );
  assert.equal(state.material.stockQuantity, 3);
  assert.equal(state.material.version, 1);
});

test('two devices setting an absolute material stock from the same version: the second is rejected as a conflict', async () => {
  const { service, state } = fixture({ stockQuantity: 10, version: 1 });
  await service.adjust('mat-1', { stockQuantity: 8, reason: 'Device A count', expectedVersion: 1, commandId: 'cmd-abs-a', deviceId: 'device-1' }, 'admin@vikipat.com');
  await assert.rejects(
    service.adjust('mat-1', { stockQuantity: 6, reason: 'Device B count', expectedVersion: 1, commandId: 'cmd-abs-b', deviceId: 'device-2' }, 'admin@vikipat.com'),
    (err) => err instanceof ConflictException,
  );
  assert.equal(state.material.stockQuantity, 8);
  assert.equal(state.material.version, 2);
});

test('two devices setting an absolute product stock from the same version: the second is rejected as a conflict', async () => {
  const { AdminService } = require('../dist/admin.service');
  const product = { id: 'prod-1', name: 'Mug', stock: 10, version: 1 };
  const repos = new Map([
    [Product, { findOne: async ({ where }) => (where.id === product.id ? { ...product } : null), save: async (p) => { Object.assign(product, p); return { ...product }; } }],
    [StockActivity, { create: (d) => d, save: async (d) => d }],
    [SyncedCommand, (() => { const m = new Map(); return { findOne: async ({ where: { id } }) => m.get(id) ?? null, save: async (r) => { m.set(r.id, r); return r; } }; })()],
  ]);
  const products = { manager: { transaction: async (fn) => fn({ connection: { options: { type: 'sqlite' } }, getRepository: (e) => repos.get(e) }) } };
  const service = new AdminService(products, null, null, null, null, { audit: async () => {} });
  await service.adjust('prod-1', { stock: 8, reason: 'Device A count', expectedVersion: 1, commandId: 'cmd-p-a', deviceId: 'd1' }, 'admin@vikipat.com');
  await assert.rejects(
    service.adjust('prod-1', { stock: 6, reason: 'Device B count', expectedVersion: 1, commandId: 'cmd-p-b', deviceId: 'd2' }, 'admin@vikipat.com'),
    (err) => err instanceof ConflictException,
  );
  assert.equal(product.stock, 8);
});

test('absolute adjustment DTOs accept expectedVersion', async () => {
  const opts = { whitelist: true, forbidNonWhitelisted: true };
  assert.equal((await validate(plainToInstance(AdjustStockDto, { stock: 4, reason: 'Recount', expectedVersion: 3 }), opts)).length, 0);
  assert.equal((await validate(plainToInstance(AdjustMaterialStockDto, { stockQuantity: 4, reason: 'Recount', expectedVersion: 3 }), opts)).length, 0);
});
