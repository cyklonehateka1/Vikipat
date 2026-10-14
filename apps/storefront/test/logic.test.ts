import { test } from 'node:test';
import assert from 'node:assert/strict';
import { progressFor } from '../src/lib/progress.ts';
import { minRateFor, minPriceIn } from '../src/lib/priceHints.ts';
import { parseDimension, resolveStep } from '../src/lib/printSteps.ts';

test('progress: awaiting payment lights nothing and marks paid as current', () => {
  assert.deepEqual(progressFor('Awaiting payment'), { lit: 0, current: 0, halted: null });
  assert.deepEqual(progressFor('Under review'), { lit: 0, current: 0, halted: null });
});

test('progress: statuses map onto the four dots', () => {
  assert.deepEqual(progressFor('Payment received'), { lit: 1, current: 1, halted: null });
  assert.deepEqual(progressFor('Awaiting your approval'), { lit: 1, current: 1, halted: null });
  assert.deepEqual(progressFor('In production'), { lit: 2, current: 2, halted: null });
  assert.deepEqual(progressFor('Out for delivery'), { lit: 3, current: 3, halted: null });
  assert.deepEqual(progressFor('Completed'), { lit: 4, current: null, halted: null });
});

test('progress: halted and unknown statuses', () => {
  assert.equal(progressFor('On hold').halted, 'on_hold');
  assert.equal(progressFor('Cancelled').halted, 'cancelled');
  assert.deepEqual(progressFor('Something new'), { lit: 0, current: null, halted: null });
});

test('price hints', () => {
  const mats = [
    { outcomes: ['shop-signage'], ratePesewasPerSqFt: 730 },
    { outcomes: ['shop-signage', 'events-backdrops'], ratePesewasPerSqFt: 260 },
    { outcomes: ['stickers-labels'], ratePesewasPerSqFt: 240, category: 'sticker' },
    { outcomes: ['stickers-labels'], ratePesewasPerSqFt: 180, category: 'finish' },
  ] as never[];
  assert.equal(minRateFor(mats, 'shop-signage'), 260);
  assert.equal(minRateFor(mats, 'stickers-labels'), 240, 'cutting-only services are not quoted as print prices');
  assert.equal(minRateFor(mats, 'vehicle-glass'), null);
  const products = [
    { department: 'DTF', price: 85 },
    { department: 'DTF', price: 60 },
    { department: 'Souvenirs', price: 55 },
  ];
  assert.equal(minPriceIn(products, ['DTF']), 60);
  assert.equal(minPriceIn(products, ['Packaging']), null);
});

test('parseDimension rejects junk', () => {
  assert.equal(parseDimension(''), null);
  assert.equal(parseDimension('0'), null);
  assert.equal(parseDimension('-2'), null);
  assert.equal(parseDimension('abc'), null);
  assert.equal(parseDimension('10001'), null);
  assert.equal(parseDimension('2.5'), 2.5);
});

test('resolveStep never lands on a step whose inputs are missing', () => {
  assert.equal(resolveStep(null, false, false), 'job');
  assert.equal(resolveStep('artwork', false, false), 'job');
  assert.equal(resolveStep('artwork', true, false), 'size');
  assert.equal(resolveStep('artwork', true, true), 'artwork');
  assert.equal(resolveStep('size', true, false), 'size');
  assert.equal(resolveStep(null, true, false), 'size');
  assert.equal(resolveStep('job', true, true), 'job');
});
