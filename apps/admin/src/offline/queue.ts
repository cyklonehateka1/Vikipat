import {getDeviceId, openOfflineDb} from './db';

export type QueuedCommand = {
  id: string;
  type: string;
  payload: object;
  expectedVersion?: number;
  deviceId: string;
  createdAt: string;
  status: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
};

export async function enqueueCommand(
  type: string,
  payload: object,
  expectedVersion?: number,
): Promise<QueuedCommand> {
  const deviceId = await getDeviceId();
  const db = await openOfflineDb();

  const command: QueuedCommand = {
    id: crypto.randomUUID(),
    type,
    payload,
    ...(expectedVersion !== undefined ? {expectedVersion} : {}),
    deviceId,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('commands', 'readwrite');
    tx.objectStore('commands').put(command);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return command;
}

export async function listCommands(status?: QueuedCommand['status']): Promise<QueuedCommand[]> {
  const db = await openOfflineDb();

  const all = await new Promise<QueuedCommand[]>((resolve, reject) => {
    const tx = db.transaction('commands', 'readonly');
    const req = tx.objectStore('commands').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const filtered = status ? all.filter((c) => c.status === status) : all;
  return filtered.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function updateCommandStatus(
  id: string,
  status: QueuedCommand['status'],
  extra?: object,
): Promise<void> {
  const db = await openOfflineDb();

  const existing = await new Promise<QueuedCommand | undefined>((resolve, reject) => {
    const tx = db.transaction('commands', 'readonly');
    const req = tx.objectStore('commands').get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (!existing) return;

  const updated = {...existing, ...extra, status};

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('commands', 'readwrite');
    tx.objectStore('commands').put(updated);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
