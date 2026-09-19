const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateLargeFormat } = require('../dist');

const rule = (overrides = {}) => ({
  serviceCode: 'flexy-banner',
  serviceName: 'Flexy / Banner',
  version: 1,
  ratesPesewasPerSqFt: { online: 260, walk_in: 260, marketer: 240, employee: 230 },
  designMinimumPesewas: 10000,
  roundingMode: 'nearest_cedi',
  roundingStage: 'line',
  ...overrides,
});

test('matches the supplied 3 ft x 3 ft banner example', () => {
  const result = calculateLargeFormat(rule(), {
    width: 3, height: 3, unit: 'ft', quantity: 1, priceBook: 'walk_in', needsDesign: false,
  });
  assert.equal(result.totalAreaSqFt, 9);
  assert.equal(result.basePesewas, 2300);
  assert.equal(result.totalPesewas, 2300);
  assert.equal(result.disposition, 'final');
});

test('matches the supplied 3.5 in x 2 in sticker example', () => {
  const result = calculateLargeFormat(rule({
    serviceCode: 'sav-sticker',
    serviceName: 'SAV / Sticker',
    ratesPesewasPerSqFt: { online: 240, walk_in: 240, marketer: 220, employee: 210 },
  }), {
    width: 3.5, height: 2, unit: 'in', quantity: 100, priceBook: 'walk_in', needsDesign: false,
  });
  assert.equal(result.basePesewas, 1200);
});

test('treats the GH₵100 design fee as provisional until staff confirms it', () => {
  const result = calculateLargeFormat(rule(), {
    width: 3, height: 3, unit: 'ft', quantity: 1, priceBook: 'online', needsDesign: true,
  });
  assert.equal(result.designFeePesewas, 10000);
  assert.equal(result.disposition, 'provisional');
  assert.deepEqual(result.reviewReasons, ['design_fee_requires_review']);
});

test('accepts a staff-confirmed design fee at or above the minimum', () => {
  const result = calculateLargeFormat(rule(), {
    width: 3, height: 3, unit: 'ft', quantity: 1, priceBook: 'walk_in', needsDesign: true, confirmedDesignFeePesewas: 17500,
  });
  assert.equal(result.designFeePesewas, 17500);
  assert.equal(result.disposition, 'final');
});

test('rejects invalid quantities and design fees below the minimum', () => {
  assert.throws(() => calculateLargeFormat(rule(), {
    width: 3, height: 3, unit: 'ft', quantity: 0, priceBook: 'online', needsDesign: false,
  }), /Quantity/);
  assert.throws(() => calculateLargeFormat(rule(), {
    width: 3, height: 3, unit: 'ft', quantity: 1, priceBook: 'online', needsDesign: true, confirmedDesignFeePesewas: 9999,
  }), /minimum/);
});

test('generates stable fingerprints and changes them when pricing inputs change', () => {
  const input = { width: 3, height: 3, unit: 'ft', quantity: 1, priceBook: 'online', needsDesign: false };
  const first = calculateLargeFormat(rule(), input);
  const second = calculateLargeFormat(rule(), input);
  const changed = calculateLargeFormat(rule({ version: 2 }), input);
  assert.equal(first.fingerprint, second.fingerprint);
  assert.notEqual(first.fingerprint, changed.fingerprint);
});
