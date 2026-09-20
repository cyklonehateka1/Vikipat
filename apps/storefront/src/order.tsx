import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Product, useCatalog } from "./catalog";
import { amount, money } from "./lib/format";
import { site } from "./site";
import { CalculatedEstimate } from "./types/pricing";

export type OrderLine = { id: string; qty: number };
export type ResolvedLine = { product: Product; qty: number; lineTotal: number };

export interface CustomPrintJobItem {
  id: string; // unique item id
  estimate: CalculatedEstimate;
  artworkUrl?: string;
  artworkName?: string;
  artworkOption: "upload" | "design_service" | "link" | "later";
  artworkLink?: string;
  notes?: string;
}

const STORAGE_KEY = "vikipat.quote-list.v2";
const JOBS_STORAGE_KEY = "vikipat.print-jobs.v2";
const MAX_QTY = 999;

const clamp = (qty: number) => Math.min(MAX_QTY, Math.max(1, Math.round(qty)));

function readStoredLines(): OrderLine[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (line) => typeof line?.id === "string" && Number.isFinite(line?.qty),
      )
      .map((line) => ({
        id: line.id as string,
        qty: clamp(line.qty as number),
      }));
  } catch {
    return [];
  }
}

function readStoredJobs(): CustomPrintJobItem[] {
  try {
    const stored = window.localStorage.getItem(JOBS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

type OrderValue = {
  lines: OrderLine[];
  items: ResolvedLine[];
  customJobs: CustomPrintJobItem[];
  count: number;
  total: number; // in GHS
  totalPesewas: number; // in Pesewas for Paystack / checkout accuracy
  pulse: number;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  add: (product: Product, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  stepQty: (id: string, delta: number) => void;
  remove: (id: string) => void;
  addCustomJob: (job: Omit<CustomPrintJobItem, "id">) => string;
  removeCustomJob: (jobId: string) => void;
  updateCustomJobEstimate: (jobId: string, estimate: CustomPrintJobItem["estimate"]) => void;
  clear: () => void;
  qtyOf: (id: string) => number;
};

const OrderContext = createContext<OrderValue | null>(null);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const { products } = useCatalog();
  const [lines, setLines] = useState<OrderLine[]>(readStoredLines);
  const [customJobs, setCustomJobs] =
    useState<CustomPrintJobItem[]>(readStoredJobs);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {}
  }, [lines]);

  useEffect(() => {
    try {
      window.localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(customJobs));
    } catch {}
  }, [customJobs]);

  const add = useCallback((product: Product, qty = 1) => {
    setLines((current) => {
      const existing = current.find((line) => line.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.id === product.id
            ? { ...line, qty: clamp(line.qty + qty) }
            : line,
        );
      }
      return [...current, { id: product.id, qty: clamp(qty) }];
    });
    setPulse((current) => current + 1);
  }, []);

  const addCustomJob = useCallback((job: Omit<CustomPrintJobItem, "id">) => {
    const id = `JOB-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const fullJob: CustomPrintJobItem = { ...job, id };
    setCustomJobs((current) => [fullJob, ...current]);
    setPulse((current) => current + 1);
    return id;
  }, []);

  const removeCustomJob = useCallback((jobId: string) => {
    setCustomJobs((current) => current.filter((j) => j.id !== jobId));
  }, []);

  /** Replaces a job's price quote in place, e.g. after re-pricing an expired estimate at checkout. */
  const updateCustomJobEstimate = useCallback((jobId: string, estimate: CustomPrintJobItem["estimate"]) => {
    setCustomJobs((current) => current.map((j) => (j.id === jobId ? { ...j, estimate } : j)));
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    if (qty < 1) {
      setLines((current) => current.filter((line) => line.id !== id));
      return;
    }
    setLines((current) =>
      current.map((line) =>
        line.id === id ? { ...line, qty: clamp(qty) } : line,
      ),
    );
  }, []);

  const stepQty = useCallback((id: string, delta: number) => {
    setLines((current) => {
      const line = current.find((item) => item.id === id);
      if (!line) return current;
      if (line.qty + delta < 1) return current.filter((item) => item.id !== id);
      return current.map((item) =>
        item.id === id ? { ...item, qty: clamp(item.qty + delta) } : item,
      );
    });
  }, []);

  const remove = useCallback((id: string) => {
    setLines((current) => current.filter((line) => line.id !== id));
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setCustomJobs([]);
  }, []);

  const items = useMemo(() => {
    if (!products.length) return [];
    return lines.flatMap((line) => {
      const product = products.find((candidate) => candidate.id === line.id);
      if (!product) return [];
      return [{ product, qty: line.qty, lineTotal: product.price * line.qty }];
    });
  }, [lines, products]);

  const productUnits = useMemo(
    () => items.reduce((sum, item) => sum + item.qty, 0),
    [items],
  );
  const customJobUnits = useMemo(
    () => customJobs.reduce((sum, job) => sum + job.estimate.quantity, 0),
    [customJobs],
  );
  const count = productUnits + customJobUnits;

  const productTotalPesewas = useMemo(
    () =>
      Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0) * 100),
    [items],
  );
  const customJobTotalPesewas = useMemo(
    () => customJobs.reduce((sum, job) => sum + job.estimate.totalPesewas, 0),
    [customJobs],
  );
  const totalPesewas = productTotalPesewas + customJobTotalPesewas;
  const total = totalPesewas / 100;

  const qtyOf = useCallback(
    (id: string) => lines.find((line) => line.id === id)?.qty ?? 0,
    [lines],
  );

  const value = useMemo(
    () => ({
      lines,
      items,
      customJobs,
      count,
      total,
      totalPesewas,
      pulse,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      add,
      addCustomJob,
      removeCustomJob,
      updateCustomJobEstimate,
      setQty,
      stepQty,
      remove,
      clear,
      qtyOf,
    }),
    [
      lines,
      items,
      customJobs,
      count,
      total,
      totalPesewas,
      pulse,
      drawerOpen,
      add,
      addCustomJob,
      removeCustomJob,
      updateCustomJobEstimate,
      setQty,
      stepQty,
      remove,
      clear,
      qtyOf,
    ],
  );

  return (
    <OrderContext.Provider value={value}>{children}</OrderContext.Provider>
  );
}

export function useOrder() {
  const value = useContext(OrderContext);
  if (!value) throw new Error("useOrder must be used within OrderProvider");
  return value;
}

export function buildOrderMessage(
  items: ResolvedLine[],
  customJobs: CustomPrintJobItem[],
  total: number,
  note?: string,
) {
  const lines: string[] = [];

  customJobs.forEach((job, index) => {
    lines.push(
      `[Custom Job #${index + 1}] ${job.estimate.serviceName}\n` +
        `   Dimensions: ${job.estimate.width} x ${job.estimate.height} ${job.estimate.unit} (${job.estimate.totalAreaSqFt} sq ft total)\n` +
        `   Quantity: ${job.estimate.quantity}\n` +
        `   Printing Subtotal: GH₵ ${(job.estimate.basePesewas / 100).toFixed(2)}\n` +
        (job.estimate.designFeePesewas > 0
          ? `   Design Service (Provisional Min): GH₵ ${(job.estimate.designFeePesewas / 100).toFixed(2)}\n`
          : "") +
        `   Job Total: GH₵ ${(job.estimate.totalPesewas / 100).toFixed(2)}`,
    );
  });

  items.forEach((item, index) => {
    lines.push(
      `[Product #${index + 1}] ${item.product.name}\n` +
        `   ${item.product.unit} x ${item.qty} = ${money(item.lineTotal)}\n` +
        `   Ref: ${item.product.ref}`,
    );
  });

  const parts = [
    `Hello ${site.name}, I would like to place an order on the platform:`,
    "",
    lines.join("\n\n"),
    "",
    `Total Estimated Value: GH₵ ${amount(total)}`,
  ];

  if (note?.trim()) {
    parts.push("", `Project Notes: ${note.trim()}`);
  }

  parts.push("", "Please confirm availability and dispatch schedule.");
  return parts.join("\n");
}

export function buildSingleMessage(product: Product, qty: number) {
  return [
    `Hello ${site.name}, I would like to order:`,
    "",
    `${product.name}`,
    `${product.unit} x ${qty} = ${money(product.price * qty)}`,
    `Ref ${product.ref}`,
    "",
    "Please confirm availability and the delivery window.",
  ].join("\n");
}
