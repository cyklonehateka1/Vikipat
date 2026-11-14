import 'fake-indexeddb/auto';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {openOfflineDb} from './db';
import {enqueueCommand, listCommands} from './queue';

const releaseOrder = vi.fn().mockResolvedValue({ok: true});
const adjustStock = vi.fn().mockResolvedValue({ok: true});

vi.mock('../api', () => ({
  api: {releaseOrder, adjustStock},
}));

const realIndexedDB = globalThis.indexedDB;

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
  releaseOrder.mockClear();
  adjustStock.mockClear();
  vi.resetModules();
});

afterEach(() => {
  globalThis.indexedDB = realIndexedDB;
});

test('replaying a queued order.release command forwards expectedVersion to api.releaseOrder', async () => {
  const {runSyncPass} = await import('./sync');

  await enqueueCommand('order.release', {
    orderId: 'order-1',
    overrideReason: 'manager override',
    expectedVersion: 5,
    commandId: 'cmd-order-1',
  });

  await runSyncPass();

  expect(releaseOrder).toHaveBeenCalledWith('order-1', 'manager override', 5);

  const [synced] = await listCommands('synced');
  expect(synced).toBeDefined();
});

test('replaying a queued stock.adjust command forwards commandId to api.adjustStock', async () => {
  const {runSyncPass} = await import('./sync');

  await enqueueCommand('stock.adjust', {
    productId: 'product-1',
    stock: 10,
    reason: 'count correction',
    commandId: 'cmd-stock-1',
  });

  await runSyncPass();

  expect(adjustStock).toHaveBeenCalledWith('product-1', 10, 'count correction', 'cmd-stock-1');

  const [synced] = await listCommands('synced');
  expect(synced).toBeDefined();
});
