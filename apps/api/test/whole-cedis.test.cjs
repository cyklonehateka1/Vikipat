const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { plainToInstance } = require('class-transformer');
const { validateSync } = require('class-validator');
const { CreateProductDto, LargeFormatEstimateDto } = require('../dist/dto');
const { RecordPaymentDto } = require('../dist/commerce.service');
const { RefundOrderDto, UpdatePayslipDto } = require('../dist/people.dto');
const { computePay } = require('../dist/people.service');
const { ghs } = require('../dist/finance');

const errorsFor = (Dto, body) => validateSync(plainToInstance(Dto, body)).map((error) => error.property);

test('part-cedi amounts are refused at the API boundary', () => {
  const payment = { requestKey: '7b0b6c1e-6d8f-4d55-9a7a-3c1f1d1f2a10', method: 'cash', externalReference: 'R1', occurredAt: '2026-10-13T10:00:00Z' };
  assert.deepEqual(errorsFor(RecordPaymentDto, { ...payment, amountPesewas: 12550 }), ['amountPesewas']);
  assert.deepEqual(errorsFor(RecordPaymentDto, { ...payment, amountPesewas: 12500 }), []);
  assert.deepEqual(errorsFor(RefundOrderDto, { amountPesewas: 99, reason: 'Damaged' }), ['amountPesewas']);
  assert.deepEqual(errorsFor(UpdatePayslipDto, { bonusPesewas: 5050 }), ['bonusPesewas']);
  assert.ok(errorsFor(LargeFormatEstimateDto, { serviceCode: 'flexy-banner', width: 3, height: 3, unit: 'ft', quantity: 1, designFeePesewas: 15050 }).includes('designFeePesewas'));
});

test('product prices are whole cedis', () => {
  const product = { name: 'Mug', category: 'Souvenirs', unit: '1 mug', description: 'A mug', stock: 1 };
  assert.ok(errorsFor(CreateProductDto, { ...product, price: 55.5 }).includes('price'));
  assert.ok(!errorsFor(CreateProductDto, { ...product, price: 55 }).includes('price'));
});

test('payroll comes out in whole cedis', () => {
  const policy = { shiftMinutes: 480, workingDaysPerMonth: 26, overtimeMultiplier: 1.5 };
  const hourly = { payType: 'hourly', payRatePesewas: 1300 };
  const pay = computePay(hourly, 1, 7 * 60 + 13, 47, policy, '2026-10-01', '2026-10-01');
  assert.equal(pay.basePesewas % 100, 0);
  assert.equal(pay.overtimePesewas % 100, 0);
});

test('amounts in messages read as whole cedis', () => {
  assert.equal(ghs(125000), 'GHS 1,250');
  assert.equal(ghs(8350), 'GHS 84');
});
