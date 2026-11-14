import 'fake-indexeddb/auto';
import {beforeEach, expect, test, vi} from 'vitest';
import {openOfflineDb} from './db';
import {enqueueCommand, listCommands} from './queue';

const sendCommand = vi.fn().mockResolvedValue({ok: true});
const releaseOrder = vi.fn();

vi.mock('../api', () => ({
  commandTypes: ['order.release'],
  sendCommand,
  api: {releaseOrder},
}));

beforeEach(async () => {
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('commands', 'readwrite');
    tx.objectStore('commands').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  vi.resetModules();
});

test('replay sends the queued payload directly instead of through the queueing api wrapper', async () => {
  const {runSyncPass} = await import('./sync');
  const payload = {orderId: 'order-1', expectedVersion: 5, commandId: 'cmd-order-1'};
  await enqueueCommand('order.release', payload, 5);

  await runSyncPass();

  expect(sendCommand).toHaveBeenCalledWith('order.release', payload);
  expect(releaseOrder).not.toHaveBeenCalled();
  expect(await listCommands('synced')).toHaveLength(1);
});
