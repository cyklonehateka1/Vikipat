import { useEffect, useState } from 'react';
import { PrintMaterial } from '../types/pricing';
import { API_BASE } from './api';

interface MaterialsState {
  materials: PrintMaterial[];
  loading: boolean;
  error: string | null;
}

// One request serves every component on the page (home tiles, the print flow),
// and later visits reuse it. The API is the only source of rates and copy.
let cached: PrintMaterial[] | null = null;
let inflight: Promise<PrintMaterial[]> | null = null;

function loadMaterials() {
  if (cached) return Promise.resolve(cached);
  inflight ??= fetch(`${API_BASE}/catalog/print-materials`)
    .then((response) => {
      if (!response.ok) throw new Error('Print prices are not available right now.');
      return response.json();
    })
    .then((data) => {
      cached = Array.isArray(data) ? data : [];
      return cached;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** The print material catalogue (rates and copy), with a retry for failures. */
export function useMaterials(): MaterialsState & { retry: () => void } {
  const [state, setState] = useState<MaterialsState>(() => ({
    materials: cached ?? [],
    loading: !cached,
    error: null,
  }));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (cached) {
      setState({ materials: cached, loading: false, error: null });
      return;
    }
    let alive = true;
    setState((current) => ({ ...current, loading: true, error: null }));
    loadMaterials()
      .then((materials) => alive && setState({ materials, loading: false, error: null }))
      .catch((thrown: unknown) => {
        if (!alive) return;
        setState({
          materials: [],
          loading: false,
          error: thrown instanceof Error ? thrown.message : 'Print prices are not available right now.',
        });
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
