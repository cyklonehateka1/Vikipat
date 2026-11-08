const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { MaterialService } = require('../dist/material.service');
const { MaterialItem, MaterialPhysicalCount, MaterialStockActivity, Product, StockActivity } = require('../dist/entities');

function countFixture({ stockQuantity = 50, tolerancePercent = 90, kind = 'material_item' } = {}) {
  const state = {
    material: { id: 'm1', name: 'Flexy/Banner 5ft', stockQuantity, tolerancePercent },
    product: { id: 'p1', name: 'Business card pack', stock: stockQuantity, tolerancePercent },
    counts: [], materialStockActivity: [], productStockActivity: [],
  };
  const manager = {
    connection: { options: { type: 'sqlite' } },
    getRepository: (entity) => {
      if (entity === MaterialItem) return {
        findOne: async ({ where }) => (where.id === state.material.id ? state.material : null),
        save: async (m) => { state.material = { ...state.material, ...m }; return state.material; },
      };
      if (entity === Product) return {
        findOne: async ({ where }) => (where.id === state.product.id ? state.product : null),
        save: async (p) => { state.product = { ...state.product, ...p }; return state.product; },
      };
      if (entity === MaterialPhysicalCount) return { create: (d) => ({ ...d }), save: async (d) => { state.counts.push(d); return d; } };
      if (entity === MaterialStockActivity) return { create: (d) => ({ ...d }), save: async (d) => { state.materialStockActivity.push(d); return d; } };
      if (entity === StockActivity) return { create: (d) => ({ ...d }), save: async (d) => { state.productStockActivity.push(d); return d; } };
    },
  };
  const materials = { manager: { transaction: async (fn) => fn(manager) } };
  const service = new MaterialService(materials, null, null, null, null, null, null);
  return { service, state };
}

test('a count below tolerance is stored with its accounted-for percent, and resets the stock to what was measured', async () => {
  const { service, state } = countFixture({ stockQuantity: 50, tolerancePercent: 90 });
  const record = await service.recordPhysicalCount('material_item', 'm1', 40, 'owner@vikipat.com');
  assert.equal(record.expectedQuantity, 50);
  assert.equal(record.accountedForPercent, 80);
  assert.equal(state.material.stockQuantity, 40);
});

test('a count at or above tolerance is still stored, just not a shortfall', async () => {
  const { service } = countFixture({ stockQuantity: 50, tolerancePercent: 90 });
  const record = await service.recordPhysicalCount('material_item', 'm1', 47, 'owner@vikipat.com');
  assert.equal(record.accountedForPercent, 94);
});

test('an expected quantity of zero does not throw, and reports no percentage', async () => {
  const { service } = countFixture({ stockQuantity: 0 });
  const record = await service.recordPhysicalCount('material_item', 'm1', 5, 'owner@vikipat.com');
  assert.equal(record.accountedForPercent, null);
});

test('recording a material count writes a MaterialStockActivity row, same as adjust()', async () => {
  const { service, state } = countFixture({ stockQuantity: 50 });
  await service.recordPhysicalCount('material_item', 'm1', 40, 'owner@vikipat.com');
  assert.equal(state.materialStockActivity.length, 1);
  assert.equal(state.materialStockActivity[0].previousQuantity, 50);
  assert.equal(state.materialStockActivity[0].newQuantity, 40);
  assert.equal(state.materialStockActivity[0].reason, 'Physical count');
});

test('recording a product count writes a StockActivity row and resets stock', async () => {
  const { service, state } = countFixture({ stockQuantity: 20 });
  const record = await service.recordPhysicalCount('product', 'p1', 18, 'owner@vikipat.com');
  assert.equal(record.expectedQuantity, 20);
  assert.equal(state.product.stock, 18);
  assert.equal(state.productStockActivity.length, 1);
  assert.equal(state.productStockActivity[0].reason, 'Physical count');
});

test('a fractional product count is rejected before anything is written', async () => {
  const { service, state } = countFixture({ stockQuantity: 20 });
  await assert.rejects(service.recordPhysicalCount('product', 'p1', 18.5, 'owner@vikipat.com'), /whole number/);
  assert.equal(state.counts.length, 0);
  assert.equal(state.product.stock, 20);
});
