import 'fake-indexeddb/auto';
import './testSessionStorage';
import {afterEach, beforeEach, expect, test} from 'vitest';
import {ApiError} from '../api';
import {openOfflineDb} from './db';
import {readCachedReference, refreshReferenceCache} from './referenceCache';
import {loadFailSoft, resolveBootUser} from './bootResilience';
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

test('Root falls back to the cached user on a network failure from api.me()', () => {
  const cachedUser = {email: 'owner@vikipat.com', name: 'Owner', role: 'admin', permissions: [], mustChangePassword: false};

  const result = resolveBootUser(new TypeError('Failed to fetch'), cachedUser);

  expect(result).toEqual(cachedUser);
});

test('Root still logs out on a real 401 from api.me()', () => {
  const cachedUser = {email: 'owner@vikipat.com', name: 'Owner', role: 'admin', permissions: [], mustChangePassword: false};

  const result = resolveBootUser(new ApiError(401, 'Unauthorized'), cachedUser);

  expect(result).toBeNull();
});

test('App.load falls back to cached reference data when the products call fails on a network error', async () => {
  const seedApi = {
    products: async () => [{id: 'cached-product'}],
    pricingRules: async () => [],
    materials: async () => [],
    customers: async () => [],
  } as unknown as typeof Api;
  await refreshReferenceCache(seedApi);

  const result = await loadFailSoft(
    () => Promise.reject(new TypeError('Failed to fetch')),
    () => readCachedReference('products'),
  );

  expect(result).toEqual([{id: 'cached-product'}]);
});

test('loadFailSoft surfaces a real non-network error through onError but still falls back', async () => {
  const errors: unknown[] = [];

  const result = await loadFailSoft(
    () => Promise.reject(new Error('boom')),
    () => [{id: 'fallback'}],
    (e) => errors.push(e),
  );

  expect(result).toEqual([{id: 'fallback'}]);
  expect(errors).toHaveLength(1);
});

test('loadFailSoft rethrows a real 401 so the caller can log out', async () => {
  await expect(
    loadFailSoft(
      () => Promise.reject(new ApiError(401, 'Unauthorized')),
      () => [],
    ),
  ).rejects.toBeInstanceOf(ApiError);
});
