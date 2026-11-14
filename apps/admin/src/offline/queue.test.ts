import 'fake-indexeddb/auto';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {openOfflineDb} from './db';
import {conflictSubject, enqueueCommand, listCommands, subjectSyncStatus, updateCommandStatus} from './queue';

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

test('conflictSubject picks the first identifiable id out of the payload', async () => {
  const withOrder = await enqueueCommand('order.release', {orderId: 'ord-1', overrideReason: 'x'});
  expect(conflictSubject(withOrder)).toBe('orderId: ord-1');

  const withJob = await enqueueCommand('productionJob.update', {jobId: 'job-9'});
  expect(conflictSubject(withJob)).toBe('jobId: job-9');
});

test('conflictSubject falls back to the command type when payload has no known id field', async () => {
  const command = await enqueueCommand('customer.create', {name: 'Ama'});
  expect(conflictSubject(command)).toBe('customer.create');
});

test('subjectSyncStatus returns conflict when any matching command has conflicted', async () => {
  const a = await enqueueCommand('payment.record', {orderId: 'ord-1'});
  const b = await enqueueCommand('refund.record', {orderId: 'ord-1'});
  await updateCommandStatus(a.id, 'synced');
  await updateCommandStatus(b.id, 'conflict');

  const commands = await listCommands();
  expect(subjectSyncStatus(commands, 'orderId', 'ord-1')).toBe('conflict');
});

test('subjectSyncStatus returns pending when a matching command is pending or syncing but none conflict', async () => {
  const a = await enqueueCommand('productionJob.update', {jobId: 'job-1'});
  await updateCommandStatus(a.id, 'syncing');

  const commands = await listCommands();
  expect(subjectSyncStatus(commands, 'jobId', 'job-1')).toBe('pending');
});

test('subjectSyncStatus returns undefined when nothing matches or everything synced', async () => {
  const a = await enqueueCommand('customer.update', {customerId: 'cus-1'});
  await updateCommandStatus(a.id, 'synced');

  const commands = await listCommands();
  expect(subjectSyncStatus(commands, 'customerId', 'cus-1')).toBeUndefined();
  expect(subjectSyncStatus(commands, 'customerId', 'cus-2')).toBeUndefined();
});
