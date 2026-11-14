import 'fake-indexeddb/auto';
import './testSessionStorage';
import {createRequire} from 'node:module';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {openOfflineDb} from './db';
import {listCommands} from './queue';
import {api} from '../api';
import {runSyncPass} from './sync';

// Replayed bodies are checked against the compiled backend DTOs (run `npm run build` in apps/api first).
const require = createRequire(import.meta.url);
require('reflect-metadata');
const {validate} = require('class-validator');
const {plainToInstance} = require('class-transformer');
const dto = require('../../../api/dist/dto.js');
const commerce = require('../../../api/dist/commerce.service.js');

const realIndexedDB = globalThis.indexedDB;
const ID = '6f1c2f0e-8f4a-4c47-9d3a-0a7d1f6b2e11';

beforeEach(async () => {
  globalThis.indexedDB = realIndexedDB;
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('commands', 'readwrite');
    tx.objectStore('commands').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const cases: {type: string; dto: unknown; route: RegExp; queue: () => Promise<unknown>}[] = [
  {type: 'payment.record', dto: commerce.RecordPaymentDto, route: /\/payments$/, queue: () => api.recordPayment(ID, {requestKey: crypto.randomUUID(), amountPesewas: 5000, method: 'cash', externalReference: 'Till 1', occurredAt: '2026-11-14T10:00:00.000Z'})},
  {type: 'refund.record', dto: commerce.RecordRefundDto, route: /\/refunds$/, queue: () => api.recordRefund(ID, {requestKey: crypto.randomUUID(), amountPesewas: 500, method: 'cash', externalReference: 'Till 1', occurredAt: '2026-11-14T10:00:00.000Z', reason: 'Wrong size', cancelRemainingWork: false, confirmedExternalPayment: true})},
  {type: 'order.create', dto: dto.CreateGuestOrderDto, route: /\/admin\/orders$/, queue: () => api.createOrder({customerName: 'Ama Mensah', customerEmail: '', source: 'walk_in', items: [{type: 'custom', name: 'Banner', unitPricePesewas: 1000, quantity: 1}]})},
  {type: 'order.release', dto: dto.ReleaseOrderDto, route: /\/release$/, queue: () => api.releaseOrder(ID, undefined, 3)},
  {type: 'productionJob.update', dto: dto.UpdateProductionJobDto, route: /\/production\/jobs\//, queue: () => api.updateProductionJob(ID, {stage: 'in_production', expectedVersion: 2})},
  {type: 'customer.create', dto: dto.CreateCustomerDto, route: /\/admin\/customers$/, queue: () => api.createCustomer({name: 'Ama Mensah'})},
  {type: 'customer.update', dto: dto.UpdateCustomerDto, route: /\/admin\/customers\//, queue: () => api.updateCustomer(ID, {name: 'Ama Owusu', expectedVersion: 4})},
  {type: 'material.adjustStock', dto: dto.AdjustMaterialStockDto, route: /\/stock$/, queue: () => api.adjustMaterialStock(ID, {stockQuantity: 12, reason: 'Recount', expectedVersion: 1})},
  {type: 'material.recordCount', dto: dto.RecordPhysicalCountDto, route: /\/count$/, queue: () => api.recordMaterialCount(ID, {measuredQuantity: 12, note: 'Shelf', expectedVersion: 1})},
  {type: 'stock.adjust', dto: dto.AdjustStockDto, route: /\/products\/.*\/stock$/, queue: () => api.adjustStock(ID, 7, 'Recount', 2)},
];

for (const c of cases) {
  test(`a queued ${c.type} replays with a body the real backend DTO accepts`, async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await c.queue();
    const [queued] = await listCommands('pending');
    expect(queued.type).toBe(c.type);

    const fetchMock = vi.fn().mockResolvedValue({ok: true, status: 200, json: async () => ({})});
    vi.stubGlobal('fetch', fetchMock);
    await runSyncPass();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(c.route);
    expect(url).toContain(c.type.endsWith('.create') ? '/admin/' : ID);
    const body = JSON.parse(options.body as string);
    const instance = plainToInstance(c.dto, body, {enableImplicitConversion: true});
    const errors = await validate(instance, {whitelist: true, forbidNonWhitelisted: true});
    expect(errors.map((e: {property: string}) => e.property)).toEqual([]);
    expect((await listCommands('synced')).map((s) => s.id)).toEqual([queued.id]);
  });
}
