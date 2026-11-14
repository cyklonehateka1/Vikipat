import 'fake-indexeddb/auto';
import {afterEach, beforeEach, expect, test} from 'vitest';
import {openOfflineDb} from './db';
import {readCachedReference, refreshReferenceCache} from './referenceCache';
import type {api as Api} from '../api';

const realIndexedDB = globalThis.indexedDB;

beforeEach(async () => {
  globalThis.indexedDB = realIndexedDB;
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('referenceCache', 'readwrite');
    tx.objectStore('referenceCache').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
});

afterEach(() => {
  globalThis.indexedDB = realIndexedDB;
});

test('refreshReferenceCache stores each list under its own key', async () => {
  const fakeApi = {
    products: async () => [{id: 'p1'}],
    pricingRules: async () => [{id: 'r1'}],
    materials: async () => [{id: 'm1'}],
    customers: async () => [{id: 'c1'}],
  } as unknown as typeof Api;

  await refreshReferenceCache(fakeApi);

  await expect(readCachedReference('products')).resolves.toEqual([{id: 'p1'}]);
  await expect(readCachedReference('pricingRules')).resolves.toEqual([{id: 'r1'}]);
  await expect(readCachedReference('materials')).resolves.toEqual([{id: 'm1'}]);
  await expect(readCachedReference('customers')).resolves.toEqual([{id: 'c1'}]);
});

test('refreshReferenceCache keeps previously-cached data for a source that fails to refresh', async () => {
  const goodApi = {
    products: async () => [{id: 'old-products'}],
    pricingRules: async () => [{id: 'old-rules'}],
    materials: async () => [{id: 'old-materials'}],
    customers: async () => [{id: 'old-customers'}],
  } as unknown as typeof Api;

  await refreshReferenceCache(goodApi);

  const flakyApi = {
    products: async () => [{id: 'new-products'}],
    pricingRules: async () => {
      throw new Error('pricing service unavailable');
    },
    materials: async () => [{id: 'new-materials'}],
    customers: async () => [{id: 'new-customers'}],
  } as unknown as typeof Api;

  await expect(refreshReferenceCache(flakyApi)).resolves.toBeUndefined();

  await expect(readCachedReference('products')).resolves.toEqual([{id: 'new-products'}]);
  await expect(readCachedReference('pricingRules')).resolves.toEqual([{id: 'old-rules'}]);
  await expect(readCachedReference('materials')).resolves.toEqual([{id: 'new-materials'}]);
  await expect(readCachedReference('customers')).resolves.toEqual([{id: 'new-customers'}]);
});

test('readCachedReference returns undefined for a key that was never cached', async () => {
  await expect(readCachedReference('products')).resolves.toBeUndefined();
});
