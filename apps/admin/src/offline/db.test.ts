import 'fake-indexeddb/auto';
import {afterEach, beforeEach, expect, test} from 'vitest';
import {getDeviceId, openOfflineDb, OfflineDbUnavailableError} from './db';

const realIndexedDB = globalThis.indexedDB;

beforeEach(() => {
  globalThis.indexedDB = realIndexedDB;
});

afterEach(() => {
  globalThis.indexedDB = realIndexedDB;
});

test('getDeviceId returns the same id on a second call', async () => {
  const first = await getDeviceId();
  const second = await getDeviceId();
  expect(second).toBe(first);
});

test('openOfflineDb throws OfflineDbUnavailableError when indexedDB is unavailable', async () => {
  // @ts-expect-error simulating an environment without IndexedDB
  globalThis.indexedDB = undefined;
  await expect(openOfflineDb()).rejects.toBeInstanceOf(OfflineDbUnavailableError);
});
