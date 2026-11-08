const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { MaterialService } = require('../dist/material.service');
const { MaterialItem, ProductionJob, MaterialStockActivity, MaterialConsumption } = require('../dist/entities');

function fixture({ materialStock }) {
  const state = {
    material: { id: 'm1', name: 'Flexy banner roll', unit: 'sq ft', stockQuantity: materialStock, lowStockThreshold: 10 },
    job: { id: 'job1', jobNumber: 'VP-TEST-J01' },
    stockActivity: [],
    consumption: [],
  };
  const repos = new Map([
    [MaterialItem, { findOne: async () => state.material, save: async (m) => { state.material = { ...state.material, ...m }; return state.material; } }],
    [ProductionJob, { findOne: async () => state.job }],
    [MaterialStockActivity, { create: (data) => ({ ...data }), save: async (data) => { state.stockActivity.push(data); return data; } }],
    [MaterialConsumption, { create: (data) => ({ ...data }), save: async (data) => { state.consumption.push(data); return data; } }],
  ]);
  const manager = { connection: { options: { type: 'sqlite' } }, getRepository: (entity) => repos.get(entity) };
  const materials = { manager: { transaction: async (fn) => fn(manager) } };
  const service = new MaterialService(materials, null, null);
  return { service, state };
}

test('logging consumption decrements material stock and records why', async () => {
  const { service, state } = fixture({ materialStock: 50 });
  await service.logConsumption('job1', { materialItemId: 'm1', quantity: 12, unit: 'sq ft' }, 'operator@vikipat.com');
  assert.equal(state.material.stockQuantity, 38);
  assert.equal(state.consumption[0].quantity, 12);
  assert.equal(state.stockActivity[0].reason.includes(state.job.jobNumber), true);
});

test('logging more than the material has in stock is rejected, nothing written', async () => {
  const { service, state } = fixture({ materialStock: 5 });
  await assert.rejects(service.logConsumption('job1', { materialItemId: 'm1', quantity: 12, unit: 'sq ft' }, 'operator@vikipat.com'), /stock/i);
  assert.equal(state.material.stockQuantity, 5);
  assert.equal(state.consumption.length, 0);
});
