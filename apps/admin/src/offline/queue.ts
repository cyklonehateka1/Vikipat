import {getDeviceId, openOfflineDb} from './db';

export type QueuedCommand = {
  id: string;
  type: string;
  payload: object;
  expectedVersion?: number;
  deviceId: string;
  createdAt: string;
  status: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
  conflictState?: object;
};

type StoredCommand = QueuedCommand & {sequence: number};

async function nextSequence(db: IDBDatabase): Promise<number> {
  const current = await new Promise<number | undefined>((resolve, reject) => {
    const tx = db.transaction('meta', 'readonly');
    const req = tx.objectStore('meta').get('commandSequence');
    req.onsuccess = () => resolve(req.result?.value);
    req.onerror = () => reject(req.error);
  });

  const next = (current ?? 0) + 1;

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('meta', 'readwrite');
    tx.objectStore('meta').put({key: 'commandSequence', value: next});
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return next;
}

export async function enqueueCommand(
  type: string,
  payload: object,
  expectedVersion?: number,
): Promise<QueuedCommand> {
  const deviceId = await getDeviceId();
  const db = await openOfflineDb();
  const sequence = await nextSequence(db);

  const stored: StoredCommand = {
    id: crypto.randomUUID(),
    type,
    payload,
    ...(expectedVersion !== undefined ? {expectedVersion} : {}),
    deviceId,
    createdAt: new Date().toISOString(),
    status: 'pending',
    sequence,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('commands', 'readwrite');
    tx.objectStore('commands').put(stored);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  const {sequence: _seq, ...command} = stored;
  return command;
}

export async function listCommands(status?: QueuedCommand['status']): Promise<QueuedCommand[]> {
  const db = await openOfflineDb();

  const all = await new Promise<StoredCommand[]>((resolve, reject) => {
    const tx = db.transaction('commands', 'readonly');
    const req = tx.objectStore('commands').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const filtered = status ? all.filter((c) => c.status === status) : all;
  return filtered
    .sort((a, b) => a.sequence - b.sequence)
    .map(({sequence: _seq, ...command}) => command);
}

const SUBJECT_ID_FIELDS = ['orderId', 'jobId', 'customerId', 'materialId', 'productId'];

export function conflictSubject(command: QueuedCommand): string {
  const payload = command.payload as Record<string, unknown>;
  for (const field of SUBJECT_ID_FIELDS) {
    const value = payload?.[field];
    if (typeof value === 'string' && value) return `${field}: ${value}`;
  }
  return command.type;
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
