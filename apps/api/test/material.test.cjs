const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { MaterialService } = require('../dist/material.service');

function fixture() {
  const state = {
    material: { id: 'm1', name: 'Flexy banner roll', unit: 'sq ft', stockQuantity: 100, lowStockThreshold: 20 },
    activity: [],
  };
  const materials = {
    findOneBy: async ({ id }) => (id === state.material.id ? state.material : null),
    save: async (m) => { state.material = { ...state.material, ...m }; return state.material; },
  };
  const stocks = {
    create: (data) => ({ ...data }),
    save: async (data) => { state.activity.push(data); return data; },
  };
  const auth = { audit: async () => {} };
  const service = new MaterialService(materials, stocks, auth);
  return { service, state };
}

test('adjusting material stock writes a stock activity row with the before/after quantities', async () => {
  const { service, state } = fixture();
  await service.adjust('m1', { stockQuantity: 40, reason: 'Physical count' }, 'owner@vikipat.com');
  assert.equal(state.material.stockQuantity, 40);
  assert.equal(state.activity[0].previousQuantity, 100);
  assert.equal(state.activity[0].newQuantity, 40);
  assert.equal(state.activity[0].reason, 'Physical count');
});
