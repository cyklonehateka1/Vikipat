import 'fake-indexeddb/auto';
import './offline/testSessionStorage';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {getCachedUser, openOfflineDb, setCachedUser} from './offline/db';
import {listCommands} from './offline/queue';
import {api, ApiError, isQueued, setSessionActor} from './api';

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
  globalThis.indexedDB = realIndexedDB;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('createOrder enqueues a command and resolves instead of throwing when the network is unreachable', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

  const result = await api.createOrder<{id: string}>({customerName: 'Ama', requestKey: 'rk-1'});

  expect(result).toBeTruthy();

  const pending = await listCommands('pending');
  expect(pending).toHaveLength(1);
  expect(pending[0].type).toBe('order.create');
  expect((pending[0].payload as {requestKey: string}).requestKey).toBe('rk-1');
});

test('createOrder still throws on a real 400 response rather than queuing it', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({message: 'Invalid payload'}),
    }),
  );

  await expect(api.createOrder({customerName: 'Ama'})).rejects.toBeInstanceOf(ApiError);

  const pending = await listCommands('pending');
  expect(pending).toHaveLength(0);
});

test('updateProductionJob sets commandId and expectedVersion on the queued payload', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

  await api.updateProductionJob('job-1', {stage: 'in_production', expectedVersion: 4});

  const pending = await listCommands('pending');
  expect(pending).toHaveLength(1);
  expect(pending[0].type).toBe('productionJob.update');
  const payload = pending[0].payload as {jobId: string; commandId: string; expectedVersion: number};
  expect(payload.jobId).toBe('job-1');
  expect(payload.expectedVersion).toBe(4);
  expect(typeof payload.commandId).toBe('string');
  expect(pending[0].expectedVersion).toBe(4);
});

test('releaseOrder sends expectedVersion in the request body', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({id: 'order-1'}),
  });
  vi.stubGlobal('fetch', fetchMock);

  await api.releaseOrder('order-1', undefined, 5);

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [, options] = fetchMock.mock.calls[0];
  const sentBody = JSON.parse(options.body as string);
  expect(sentBody.expectedVersion).toBe(5);
});

test('ApiError carries the parsed response body for a 409', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({version: 7}),
    }),
  );

  try {
    await api.updateProductionJob('job-1', {stage: 'ready'});
    throw new Error('expected rejection');
  } catch (e) {
    expect(e).toBeInstanceOf(ApiError);
    expect((e as ApiError).body).toEqual({version: 7});
  }
});

test('releaseOrder sends a commandId and deviceId even when online', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ok: true, status: 200, json: async () => ({jobs: [], version: 2})});
  vi.stubGlobal('fetch', fetchMock);

  await api.releaseOrder('order-1');

  const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
  expect(sentBody.commandId).toMatch(/^[0-9a-f-]{36}$/);
  expect(typeof sentBody.deviceId).toBe('string');
  expect(sentBody.orderId).toBeUndefined();
});

test('a create that gets queued is marked as queued rather than looking like a server record', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

  const result = await api.createOrder({customerName: 'Ama'});

  expect(isQueued(result)).toBe(true);
  expect(isQueued({id: 'order-1'})).toBe(false);
});

test('queued commands record the actor who made them', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  setSessionActor('ama@vikipat.com');

  await api.updateCustomer('cust-1', {name: 'Ama'});

  const [command] = await listCommands('pending');
  expect(command.actor).toBe('ama@vikipat.com');
  setSessionActor('');
});

test('logout clears the cached user even when the logout request cannot reach the server', async () => {
  await setCachedUser({email: 'ama@vikipat.com'});
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

  await api.logout().catch(() => {});

  expect(await getCachedUser()).toBeUndefined();
});
