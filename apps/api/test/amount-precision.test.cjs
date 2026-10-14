const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { plainToInstance } = require('class-transformer');
const { validateSync } = require('class-validator');
const { CreateProductDto } = require('../dist/dto');
const { RecordPaymentDto } = require('../dist/commerce.service');
const { RefundOrderDto } = require('../dist/people.dto');
const { OrderService } = require('../dist/order.service');
const { ghs } = require('../dist/finance');

const errorsFor = (Dto, body) => validateSync(plainToInstance(Dto, body)).map((error) => error.property);

test('staff can enter amounts with pesewas', () => {
  const payment = { requestKey: '7b0b6c1e-6d8f-4d55-9a7a-3c1f1d1f2a10', method: 'cash', externalReference: 'R1', occurredAt: '2026-10-13T10:00:00Z' };
  assert.deepEqual(errorsFor(RecordPaymentDto, { ...payment, amountPesewas: 12550 }), []);
  assert.deepEqual(errorsFor(RefundOrderDto, { amountPesewas: 99, reason: 'Damaged' }), []);
});

test('product prices allow pesewas, at most 2 decimal places', () => {
  const product = { name: 'Mug', category: 'Souvenirs', unit: '1 mug', description: 'A mug', stock: 1 };
  assert.ok(!errorsFor(CreateProductDto, { ...product, price: 55.5 }).includes('price'));
  assert.ok(errorsFor(CreateProductDto, { ...product, price: 55.555 }).includes('price'));
});

test('a customer print job is priced in whole cedis, including the starting design fee', async () => {
  const rule = {
    code: 'flexy-banner', name: 'Flexy', version: 1, active: true, allowCustomSize: true, fixedSizes: '',
    onlineRatePesewas: 260, walkInRatePesewas: 260, marketerRatePesewas: 240, employeeRatePesewas: 230,
    designMinimumPesewas: 10050, roundingMode: 'nearest_cedi',
  };
  const service = new OrderService({ findOneBy: async () => rule });
  const quote = await service.estimate({ serviceCode: 'flexy-banner', width: 7.3, height: 2.9, unit: 'ft', quantity: 3, needsDesign: true });
  for (const amount of [quote.basePesewas, quote.designFeePesewas, quote.totalPesewas]) assert.equal(amount % 100, 0);
});

test('amounts in messages read with 2 decimal places', () => {
  assert.equal(ghs(125000), 'GHS 1,250.00');
  assert.equal(ghs(8350), 'GHS 83.50');
});
