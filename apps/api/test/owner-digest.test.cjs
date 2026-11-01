const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { OwnerDigestService } = require('../dist/owner-digest.service');

function fixture({ ordersCreated, collectedPesewas, customPriced, lateCancellations, unattendedJobs, lowStockMaterials }) {
  const orders = {
    ordersCreatedOn: async () => ({ count: ordersCreated, bySource: { online: 0, walk_in: 0, salesperson: 0 } }),
    flagCustomPricedItems: async () => Array(customPriced).fill({}),
    flagLateCancellations: async () => Array(lateCancellations).fill({}),
    flagUnattendedJobs: async () => Array(unattendedJobs).fill({}),
  };
  const materials = { list: async () => lowStockMaterials.map((name) => ({ name, lowStock: true })) };
  const payments = { find: async () => (collectedPesewas ? [{ amountPesewas: collectedPesewas }] : []) };
  const mail = { send: async () => {} };
  const service = new OwnerDigestService(orders, materials, payments, mail);
  return { service };
}

test('the digest names the date, totals, and every flag category that fired', async () => {
  const { service } = fixture({ ordersCreated: 3, collectedPesewas: 94000, customPriced: 1, lateCancellations: 0, unattendedJobs: 2, lowStockMaterials: ['Flexy banner roll'] });
  const digest = await service.buildDigest('2026-10-30');
  assert.match(digest.subject, /2026-10-30/);
  assert.match(digest.text, /3 orders/);
  assert.match(digest.text, /1 custom-priced/);
  assert.match(digest.text, /2 unattended/);
  assert.match(digest.text, /Flexy banner roll/);
});

test('a quiet day with nothing to flag still produces a digest, not an empty string', async () => {
  const { service } = fixture({ ordersCreated: 0, collectedPesewas: 0, customPriced: 0, lateCancellations: 0, unattendedJobs: 0, lowStockMaterials: [] });
  const digest = await service.buildDigest('2026-10-30');
  assert.ok(digest.text.length > 0);
});
