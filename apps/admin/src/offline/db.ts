const DB_NAME = 'vikipat-offline';
const DB_VERSION = 1;

export class OfflineDbUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('IndexedDB is unavailable in this browser context');
    this.name = 'OfflineDbUnavailableError';
    if (cause !== undefined) this.cause = cause;
  }
}

export function openOfflineDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new OfflineDbUnavailableError());
  }

  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      reject(new OfflineDbUnavailableError(err));
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('commands')) db.createObjectStore('commands', {keyPath: 'id'});
      if (!db.objectStoreNames.contains('referenceCache')) db.createObjectStore('referenceCache', {keyPath: 'key'});
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', {keyPath: 'key'});
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new OfflineDbUnavailableError(request.error));
  });
}

export async function getDeviceId(): Promise<string> {
  const db = await openOfflineDb();

  const existing = await new Promise<string | undefined>((resolve, reject) => {
    const tx = db.transaction('meta', 'readonly');
    const req = tx.objectStore('meta').get('deviceId');
    req.onsuccess = () => resolve(req.result?.value);
    req.onerror = () => reject(req.error);
  });

  if (existing) return existing;

  const deviceId = crypto.randomUUID();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('meta', 'readwrite');
    tx.objectStore('meta').put({key: 'deviceId', value: deviceId});
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return deviceId;
}

export async function getCachedUser<T>(): Promise<T | undefined> {
  const db = await openOfflineDb();
  const value = await new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction('meta', 'readonly');
    const req = tx.objectStore('meta').get('cachedUser');
    req.onsuccess = () => resolve(req.result?.value);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return value;
}

export async function setCachedUser(user: unknown): Promise<void> {
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('meta', 'readwrite');
    tx.objectStore('meta').put({key: 'cachedUser', value: user});
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
