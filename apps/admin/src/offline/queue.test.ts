import 'fake-indexeddb/auto';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {openOfflineDb} from './db';
import {enqueueCommand, listCommands, updateCommandStatus} from './queue';

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
});

test('enqueueCommand stores a pending command retrievable by listCommands', async () => {
  const command = await enqueueCommand('order.create', {sku: 'abc'});
  expect(command.status).toBe('pending');
  expect(command.type).toBe('order.create');

  const commands = await listCommands();
  expect(commands).toHaveLength(1);
  expect(commands[0]).toEqual(command);
});

test('listCommands filtered by status only returns matching commands', async () => {
  const a = await enqueueCommand('order.create', {sku: 'a'});
  const b = await enqueueCommand('order.create', {sku: 'b'});
  await updateCommandStatus(a.id, 'synced');

  const pending = await listCommands('pending');
  expect(pending).toHaveLength(1);
  expect(pending[0].id).toBe(b.id);

  const synced = await listCommands('synced');
  expect(synced).toHaveLength(1);
  expect(synced[0].id).toBe(a.id);
});

test('updateCommandStatus changes status and merges extra fields without losing the rest', async () => {
  const command = await enqueueCommand('order.create', {sku: 'abc'}, 3);
  await updateCommandStatus(command.id, 'conflict', {serverVersion: 5});

  const [updated] = await listCommands('conflict');
  expect(updated.status).toBe('conflict');
  expect((updated as unknown as {serverVersion: number}).serverVersion).toBe(5);
  expect(updated.id).toBe(command.id);
  expect(updated.type).toBe(command.type);
  expect(updated.payload).toEqual(command.payload);
  expect(updated.expectedVersion).toBe(3);
  expect(updated.createdAt).toBe(command.createdAt);
});

test('commands from listCommands come back ordered by creation order even when timestamps collide', async () => {
  const fixedNow = new Date('2026-11-14T00:00:00.000Z');
  const dateSpy = vi.spyOn(global, 'Date').mockImplementation(() => fixedNow as unknown as Date);

  let first, second, third;
  try {
    first = await enqueueCommand('order.create', {sku: 'a'});
    second = await enqueueCommand('order.create', {sku: 'b'});
    third = await enqueueCommand('order.create', {sku: 'c'});
  } finally {
    dateSpy.mockRestore();
  }

  expect(first.createdAt).toBe(second.createdAt);
  expect(second.createdAt).toBe(third.createdAt);

  const commands = await listCommands();
  expect(commands.map((c) => c.id)).toEqual([first.id, second.id, third.id]);
});
