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
    create: (data) => ({ ...data }),
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

test('creating a roll material converts width to metres regardless of the unit entered', async () => {
  const { service, state } = fixture();
  await service.create({ name: 'Flexy/Banner 5ft', unit: 'm', stockQuantity: 50, lowStockThreshold: 10, kind: 'roll', rollWidthValue: 5, rollWidthUnit: 'ft', serviceCode: 'flexy-banner' }, 'owner@vikipat.com');
  assert.ok(Math.abs(state.material.rollWidthMetres - 1.524) < 0.001);
  assert.equal(state.material.serviceCode, 'flexy-banner');
});

test('a count material (no roll fields) still creates exactly as before', async () => {
  const { service, state } = fixture();
  await service.create({ name: 'Lamination film', unit: 'roll', stockQuantity: 10, lowStockThreshold: 2 }, 'owner@vikipat.com');
  assert.equal(state.material.kind, 'count');
  assert.equal(state.material.rollWidthMetres, null);
});

test('a new material defaults to 90% tolerance when none is given', async () => {
  const { service, state } = fixture();
  await service.create({ name: 'Flexy/Banner 5ft', unit: 'm', stockQuantity: 50, lowStockThreshold: 10 }, 'owner@vikipat.com');
  assert.equal(state.material.tolerancePercent, 90);
});

test('an explicit tolerance overrides the default', async () => {
  const { service, state } = fixture();
  await service.create({ name: 'Flexy/Banner 5ft', unit: 'm', stockQuantity: 50, lowStockThreshold: 10, tolerancePercent: 95 }, 'owner@vikipat.com');
  assert.equal(state.material.tolerancePercent, 95);
});
