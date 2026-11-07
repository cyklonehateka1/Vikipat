const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { MaterialService } = require('../dist/material.service');

function countFixture({ stockQuantity = 50, tolerancePercent = 90 } = {}) {
  const state = { material: { id: 'm1', name: 'Flexy/Banner 5ft', stockQuantity, tolerancePercent }, counts: [] };
  const materials = { findOneBy: async () => state.material, save: async (m) => { state.material = { ...state.material, ...m }; return state.material; } };
  const counts = { create: (d) => ({ ...d }), save: async (d) => { state.counts.push(d); return d; } };
  const service = new MaterialService(materials, null, null, null, null, null, counts);
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
