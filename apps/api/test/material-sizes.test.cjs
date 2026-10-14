const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { OrderService } = require('../dist/order.service');
const { PHOTOPAPER_SIZES, matchesFixedSize, parseFixedSizes } = require('../dist/material-sizes');

const rule = (overrides = {}) => ({
  code: 'photopaper', name: 'Photopaper', version: 1, active: true,
  onlineRatePesewas: 610, walkInRatePesewas: 610, marketerRatePesewas: 605, employeeRatePesewas: 590,
  designMinimumPesewas: 10000, roundingMode: 'nearest_cedi',
  allowCustomSize: false, fixedSizes: JSON.stringify(PHOTOPAPER_SIZES), ...overrides,
});
const serviceFor = (current) => new OrderService({ findOneBy: async () => current });
const request = (size) => ({ serviceCode: 'photopaper', quantity: 1, ...size });

test('listed sizes match in either orientation and across units', () => {
  assert.equal(matchesFixedSize(PHOTOPAPER_SIZES, 11.7, 16.5, 'in'), true);
  assert.equal(matchesFixedSize(PHOTOPAPER_SIZES, 16.5, 11.7, 'in'), true);
  assert.equal(matchesFixedSize([{ label: 'Board', width: 2, height: 3, unit: 'ft' }], 24, 36, 'in'), true);
  assert.equal(matchesFixedSize(PHOTOPAPER_SIZES, 12, 18, 'in'), false);
});

test('stored sizes that are malformed are ignored, never trusted', () => {
  assert.deepEqual(parseFixedSizes('not json'), []);
  assert.deepEqual(parseFixedSizes(JSON.stringify([{ label: 'X', width: -1, height: 2, unit: 'in' }, { label: 'Y', width: 1, height: 2, unit: 'cm' }])), []);
  assert.equal(parseFixedSizes(JSON.stringify(PHOTOPAPER_SIZES)).length, 4);
});

test('a size-locked material refuses a custom size', async () => {
  await assert.rejects(serviceFor(rule()).estimate(request({ width: 12, height: 18, unit: 'in' })), /only comes in these sizes: A4/);
});

test('a size-locked material prices its listed sizes, rotated too', async () => {
  const quote = await serviceFor(rule()).estimate(request({ width: 16.5, height: 11.7, unit: 'in' }));
  assert.ok(quote.totalPesewas > 0);
});

test('materials that allow custom sizes are unchanged', async () => {
  const quote = await serviceFor(rule({ allowCustomSize: true })).estimate(request({ width: 12, height: 18, unit: 'in' }));
  assert.ok(quote.totalPesewas > 0);
});
