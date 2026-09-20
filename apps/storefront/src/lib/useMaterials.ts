import { useEffect, useState } from "react";
import { PrintMaterial } from "../types/pricing";
import { API_BASE } from "./api";

interface MaterialsState {
  materials: PrintMaterial[];
  loading: boolean;
  error: string | null;
}

/** Fetches the print material catalogue (rates + copy) from the API. No local fallback data — the API is the only source of truth. */
export function useMaterials(): MaterialsState {
  const [materials, setMaterials] = useState<PrintMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/catalog/print-materials`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Materials are temporarily unavailable.");
        const data = await response.json();
        setMaterials(Array.isArray(data) ? data : []);
      } catch (thrown) {
        if ((thrown as Error).name !== "AbortError") {
          setError(
            thrown instanceof Error ? thrown.message : "Materials are temporarily unavailable.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, []);

  return { materials, loading, error };
}
