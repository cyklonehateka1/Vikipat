import 'fake-indexeddb/auto';
import './testSessionStorage';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {openOfflineDb} from './db';
import {enqueueCommand, listCommands, subjectSyncStatus} from './queue';
import {api} from '../api';
import {runSyncPass} from './sync';

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
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const offline = () => vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
const respond = (status: number, body: object = {}) => {
  const mock = vi.fn().mockResolvedValue({ok: status < 400, status, json: async () => body});
  vi.stubGlobal('fetch', mock);
  return mock;
};

test('a network drop during replay leaves the original command pending instead of queueing a copy', async () => {
  offline();
  await api.releaseOrder('order-1', undefined, 3);
  const [original] = await listCommands('pending');

  offline();
  await runSyncPass();

  const all = await listCommands();
  expect(all).toHaveLength(1);
  expect(all[0].id).toBe(original.id);
  expect(all[0].status).toBe('pending');
});

test('commands queued by another staff member wait instead of replaying under the current session', async () => {
  await enqueueCommand('customer.update', {customerId: 'c1', name: 'Ama', commandId: crypto.randomUUID()}, undefined, 'kofi@vikipat.com');
  const fetchMock = respond(200);

  await runSyncPass({actor: 'ama@vikipat.com'});
  expect(fetchMock).not.toHaveBeenCalled();
  expect(await listCommands('pending')).toHaveLength(1);

  await runSyncPass({actor: 'kofi@vikipat.com'});
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(await listCommands('synced')).toHaveLength(1);
});

test('a 401 during replay reports that sign-in is needed', async () => {
  await enqueueCommand('customer.create', {name: 'Ama', commandId: crypto.randomUUID()});
  respond(401, {message: 'Unauthorized'});
  const onAuthPaused = vi.fn();

  await runSyncPass({onAuthPaused});

  expect(onAuthPaused).toHaveBeenCalledTimes(1);
  expect(await listCommands('pending')).toHaveLength(1);
});

test('a command the server rejects is marked failed with the reason and shows as needing attention', async () => {
  await enqueueCommand('customer.update', {customerId: 'c1', name: 'A', commandId: crypto.randomUUID()});
  respond(400, {message: ['name must be longer than or equal to 2 characters']});

  await runSyncPass();

  const [failed] = await listCommands('failed');
  expect(failed.lastError).toMatch(/name must be longer/);
  expect(subjectSyncStatus(await listCommands(), 'customerId', 'c1')).toBe('failed');
});
