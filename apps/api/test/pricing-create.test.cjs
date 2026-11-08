const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { PricingAdminService } = require('../dist/pricing-admin.service');

function fixture({ existingCodes = [] } = {}) {
  const state = { rules: [], versions: [] };
  const rules = {
    existsBy: async ({ code }) => existingCodes.includes(code),
    create: (data) => ({ ...data }),
    save: async (r) => { const saved = { ...r, id: `rule${state.rules.length + 1}` }; state.rules.push(saved); return saved; },
  };
  const versions = { create: (data) => ({ ...data }), save: async (v) => { state.versions.push(v); return v; } };
  // PricingAdminService.create() calls the existing private audit() helper, which reads
  // this.dataSource.getRepository(AuditLog) — stub just enough for that call to no-op.
  const dataSource = { getRepository: () => ({ save: async () => {} }) };
  const service = new PricingAdminService(rules, null, versions, dataSource);
  return { service, state };
}

test('creating a service sets version 1 and writes an initial version snapshot', async () => {
  const { service, state } = fixture();
  const rule = await service.create({ name: 'Polypropylene Paper', employeeRatePesewas: 200, marketerRatePesewas: 210, walkInRatePesewas: 220, onlineRatePesewas: 220, designMinimumPesewas: 10000, roundingMode: 'nearest_cedi' }, 'owner@vikipat.com');
  assert.equal(rule.version, 1);
  assert.equal(rule.code, 'polypropylene-paper');
  assert.equal(state.versions[0].code, 'polypropylene-paper');
});

test('a colliding code is rejected before any write', async () => {
  const { service, state } = fixture({ existingCodes: ['flexy-banner'] });
  await assert.rejects(service.create({ name: 'Flexy', code: 'flexy-banner', employeeRatePesewas: 200, marketerRatePesewas: 200, walkInRatePesewas: 200, onlineRatePesewas: 200, designMinimumPesewas: 10000, roundingMode: 'nearest_cedi' }, 'owner@vikipat.com'), /already exists/);
  assert.equal(state.rules.length, 0);
});
