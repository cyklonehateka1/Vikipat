import {ApiError, isNetworkFailure} from '../api';

// Only a real 401 logs out; offline or other errors keep the cached user.
export function resolveBootUser<T>(error: unknown, cachedUser: T | undefined): T | null {
  if (error instanceof ApiError && error.status === 401) return null;
  return cachedUser ?? null;
}

// Loads one source; on failure falls back, reporting non-network errors via onError.
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
