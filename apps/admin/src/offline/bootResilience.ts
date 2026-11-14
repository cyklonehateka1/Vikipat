import {ApiError, isNetworkFailure} from '../api';

// A real 401 means the session is genuinely gone - log out. Anything else
// (a network failure, or any other error) keeps the last-known-good user
// so the app doesn't drop to the login screen just because it's offline.
export function resolveBootUser<T>(error: unknown, cachedUser: T | undefined): T | null {
  if (error instanceof ApiError && error.status === 401) return null;
  return cachedUser ?? null;
}

// Loads one data source without letting its failure block or blank out
// everything else. A network failure falls back to whatever `fallback`
// resolves to (cached reference data, or the last-known list); any other
// error is reported through `onError` (scoped to this source) and also
// falls back, since the caller still needs something to render.
export async function loadFailSoft<T>(
  fetcher: () => Promise<T>,
  fallback: () => Promise<T | undefined> | T | undefined,
  onError?: (error: unknown) => void,
): Promise<T | undefined> {
  try {
    return await fetcher();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error;
    if (!isNetworkFailure(error)) onError?.(error);
    return await fallback();
  }
}
