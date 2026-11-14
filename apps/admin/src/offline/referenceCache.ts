import {openOfflineDb} from './db';
import type {api as Api} from '../api';

export type ReferenceKey = 'products' | 'pricingRules' | 'materials' | 'customers';

async function putReference(key: ReferenceKey, value: unknown): Promise<void> {
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('referenceCache', 'readwrite');
    tx.objectStore('referenceCache').put({key, value});
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function refreshReferenceCache(api: typeof Api): Promise<void> {
  const sources: ReferenceKey[] = ['products', 'pricingRules', 'materials', 'customers'];

  await Promise.all(
    sources.map(async (key) => {
      try {
        const value = key === 'customers' ? await api.customers() : await api[key]();
        await putReference(key, value);
      } catch {
        // fail soft: leave previously cached value in place
      }
    }),
  );
}

export async function readCachedReference<T>(key: ReferenceKey): Promise<T | undefined> {
  const db = await openOfflineDb();
  const result = await new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction('referenceCache', 'readonly');
    const req = tx.objectStore('referenceCache').get(key);
    req.onsuccess = () => resolve(req.result?.value);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}
