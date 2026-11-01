const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { MaterialService } = require('../dist/material.service');

// MaterialService's constructor positional order (apps/api/src/material.service.ts):
// materials, stocks, auth, jobs, consumption (the last two added by Task 8).
function fixture({ jobs = [], consumption = [] } = {}) {
  const jobsRepo = { find: async () => jobs };
  const consumptionRepo = { find: async () => consumption };
  const service = new MaterialService(null, null, null, jobsRepo, consumptionRepo);
  return { service };
}

test('reconciliation returns billed area by service code and logged consumption by material, unmerged', async () => {
  const { service } = fixture({
    jobs: [{ serviceCode: 'flexy-banner', title: 'Flexy / Banner', specification: JSON.stringify({ totalAreaSqFt: 40 }), createdAt: new Date('2026-10-20') }],
    consumption: [{ materialName: 'Flexy banner roll', quantity: 30, unit: 'sq ft', createdAt: new Date('2026-10-20') }],
  });
  const result = await service.reconciliation('2026-10-01', '2026-10-31');
  assert.deepEqual(result.billedByServiceCode, [{ serviceCode: 'flexy-banner', serviceName: 'Flexy / Banner', totalAreaSqFt: 40 }]);
  assert.deepEqual(result.loggedByMaterial, [{ materialName: 'Flexy banner roll', totalQuantity: 30, unit: 'sq ft' }]);
});

test('a service code or material with nothing in range returns an empty list, not an error', async () => {
  const { service } = fixture({ jobs: [], consumption: [] });
  const result = await service.reconciliation('2026-10-01', '2026-10-31');
  assert.deepEqual(result, { billedByServiceCode: [], loggedByMaterial: [] });
});
