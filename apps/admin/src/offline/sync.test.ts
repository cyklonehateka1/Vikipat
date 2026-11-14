import 'fake-indexeddb/auto';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {openOfflineDb} from './db';
import {enqueueCommand, listCommands} from './queue';
import {runSyncPass, commandHandlers} from './sync';

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
});

class FakeApiError extends Error {
  status: number;
  body: object;
  constructor(status: number, body: object = {}) {
    super('fake api error');
    this.status = status;
    this.body = body;
  }
}

test('a successful command is marked synced', async () => {
  const command = await enqueueCommand('order.create', {requestKey: 'rk1'});
  const handler = vi.fn().mockResolvedValue({ok: true});
  commandHandlers['order.create'] = handler;

  const result = await runSyncPass();

  expect(handler).toHaveBeenCalledWith(command.payload);
  expect(result).toEqual({synced: 1, conflicts: 0, failed: 0});

  const [synced] = await listCommands('synced');
  expect(synced.id).toBe(command.id);
});

test('a 409 marks the command conflict, stores the server state, and does not retry it on the next pass', async () => {
  const serverState = {version: 7};
  const command = await enqueueCommand('payment.record', {requestKey: 'rk2'});
  commandHandlers['payment.record'] = vi.fn().mockRejectedValue(new FakeApiError(409, serverState));

  const result = await runSyncPass();

  expect(result).toEqual({synced: 0, conflicts: 1, failed: 0});

  const [conflict] = await listCommands('conflict');
  expect(conflict.id).toBe(command.id);
  expect((conflict as unknown as {conflictState: object}).conflictState).toEqual(serverState);

  const handler = vi.fn().mockResolvedValue({ok: true});
  commandHandlers['payment.record'] = handler;
  const second = await runSyncPass();

  expect(handler).not.toHaveBeenCalled();
  expect(second).toEqual({synced: 0, conflicts: 0, failed: 0});
});

test('a 401 stops the pass without processing later queued commands', async () => {
  const first = await enqueueCommand('order.create', {requestKey: 'rk3'});
  const second = await enqueueCommand('customer.create', {commandId: 'cmd-1'});

  const firstHandler = vi.fn().mockRejectedValue(new FakeApiError(401));
  const secondHandler = vi.fn().mockResolvedValue({ok: true});
  commandHandlers['order.create'] = firstHandler;
  commandHandlers['customer.create'] = secondHandler;

  const result = await runSyncPass();

  expect(firstHandler).toHaveBeenCalled();
  expect(secondHandler).not.toHaveBeenCalled();
  expect(result).toEqual({synced: 0, conflicts: 0, failed: 0});

  const pending = await listCommands('pending');
  expect(pending.map((c) => c.id)).toContain(second.id);

  void first;
});

test('a command that previously failed is retried on the next pass', async () => {
  const command = await enqueueCommand('material.adjustStock', {commandId: 'cmd-2'});
  commandHandlers['material.adjustStock'] = vi.fn().mockRejectedValue(new Error('network down'));

  const firstPass = await runSyncPass();
  expect(firstPass).toEqual({synced: 0, conflicts: 0, failed: 1});

  const [failed] = await listCommands('failed');
  expect(failed.id).toBe(command.id);

  commandHandlers['material.adjustStock'] = vi.fn().mockResolvedValue({ok: true});
  const secondPass = await runSyncPass();

  expect(secondPass).toEqual({synced: 1, conflicts: 0, failed: 0});
  const [synced] = await listCommands('synced');
  expect(synced.id).toBe(command.id);
});

test('one command conflicting does not stop a later, unrelated command in the same pass from syncing', async () => {
  await enqueueCommand('payment.record', {requestKey: 'rk4'});
  const second = await enqueueCommand('customer.create', {commandId: 'cmd-3'});

  commandHandlers['payment.record'] = vi.fn().mockRejectedValue(new FakeApiError(409, {version: 1}));
  const secondHandler = vi.fn().mockResolvedValue({ok: true});
  commandHandlers['customer.create'] = secondHandler;

  const result = await runSyncPass();

  expect(secondHandler).toHaveBeenCalled();
  expect(result).toEqual({synced: 1, conflicts: 1, failed: 0});

  const [synced] = await listCommands('synced');
  expect(synced.id).toBe(second.id);
});
