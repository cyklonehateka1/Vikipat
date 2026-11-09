const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { ValidationPipe } = require('@nestjs/common');
const { CreateQuoteDto, CreateGuestOrderDto, OrderLineItemDto } = require('../dist/dto');

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } });
const validate = (payload, metatype) => pipe.transform(payload, { type: 'body', metatype });

test('a quote request message with a script tag is stored with tags stripped, not passed through raw', async () => {
  const dto = await validate({
    name: 'Tag Tester', phone: '0241234567', need: 'Large Format', quantity: '1',
    message: 'Please call me<script>alert(1)</script> after 3pm',
  }, CreateQuoteDto);
  assert.ok(!dto.message.includes('<script>'));
  assert.ok(!dto.message.includes('</script>'));
  assert.match(dto.message, /Please call me.*after 3pm/);
});

test('a guest order customerNote with HTML tags is stripped of tags', async () => {
  const dto = await validate({
    customerName: 'Tag Tester', customerEmail: 'tag@example.test',
    items: [{ type: 'product', productId: '11111111-1111-4111-8111-111111111111', quantity: 1 }],
    customerNote: '<img src=x onerror=alert(1)>Leave at the gate',
  }, CreateGuestOrderDto);
  assert.ok(!dto.customerNote.includes('<img'));
  assert.ok(dto.customerNote.includes('Leave at the gate'));
});

test('an order line item description with HTML tags is stripped of tags', async () => {
  const dto = await validate({
    type: 'custom', name: 'Custom job', quantity: 1,
    description: '<b>Bold</b> instructions <script>alert(1)</script>',
  }, OrderLineItemDto);
  assert.ok(!dto.description.includes('<script>'));
  assert.ok(!dto.description.includes('<b>'));
  assert.ok(dto.description.includes('Bold'));
  assert.ok(dto.description.includes('instructions'));
});
