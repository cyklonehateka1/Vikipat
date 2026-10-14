import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { slugify } from "./lib/format";
import { PhotoKey, departmentPhoto } from "./content/photos";

/** Availability is derived from the stock count the admin keeps. */
export type Availability = "in" | "low" | "out";

export type Product = {
  id: string;
  name: string;
  department: string;
  departmentSlug: string;
  price: number;
  unit: string;
  description: string;
  image: string;
  stockCount: number;
  availability: Availability;
  featured: boolean;
  /** Human readable reference shown on the listing and in order messages. */
  ref: string;
};

export type Department = {
  name: string;
  slug: string;
  short: string;
  blurb: string;
  /** The photo slot that stands for this department, when one is defined. */
  photo: PhotoKey | null;
  count: number;
};

export type StoreSettings = {
  businessName: string;
  phone: string;
  location: string;
  currency: string;
  description: string;
};

/**
 * Short editorial copy per catalogue department. The API holds the products;
 * a department only appears once it has at least one.
 */
const departmentCopy: Record<string, { short: string; blurb: string }> = {
  DTF: { short: 'DTF', blurb: 'Full-colour prints on shirts and fabric.' },
  'Corporate Branding': { short: 'Corporate', blurb: 'Polos, uniforms and brand starter kits.' },
  Souvenirs: { short: 'Souvenirs', blurb: 'Mugs, totes and gifts with your print.' },
  Labels: { short: 'Labels', blurb: 'Product labels cut to your shape.' },
  Packaging: { short: 'Packaging', blurb: 'Branded boxes, sleeves and bags.' },
  'Large Format': { short: 'Large format', blurb: 'Pull-up banners and ready-made signs.' },
  Events: { short: 'Events', blurb: 'Flyers and printed pieces for launches and events.' },
};

const API_URL = (
  import.meta.env.VITE_API_URL || "https://vikipat.onrender.com/api"
).replace(/\/$/, "");

const LOW_STOCK_AT = 10;

function availabilityOf(stock: number): Availability {
  if (stock <= 0) return "out";
  if (stock < LOW_STOCK_AT) return "low";
  return "in";
}

export const availabilityLabel: Record<Availability, string> = {
  in: "In stock",
  low: "Low stock",
  out: "Sold out",
};

/** Shown in place of a product photo when the catalogue entry has none yet. */
export const FALLBACK_PRODUCT_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'%3E%3Crect width='600' height='600' fill='%23F5F4F0'/%3E%3Cg fill='none' stroke='%23C9C6BE' stroke-width='10'%3E%3Crect x='140' y='170' width='320' height='260' rx='16'/%3E%3Ccircle cx='230' cy='250' r='28'/%3E%3Cpath d='M140 380l100-90 90 70 60-50 70 70'/%3E%3C/g%3E%3C/svg%3E";

export function productImage(product: Pick<Product, "image">) {
  return product.image || FALLBACK_PRODUCT_IMAGE;
}

type ApiProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  description: string;
  image: string;
  stock: number;
  featured: boolean;
};

function toProduct(item: ApiProduct): Product {
  return {
    id: item.id,
    name: item.name,
    department: item.category,
    departmentSlug: slugify(item.category),
    price: item.price,
    unit: item.unit || "item",
    description: item.description,
    image: item.image,
    stockCount: item.stock,
    availability: availabilityOf(item.stock),
    featured: Boolean(item.featured),
    ref: `VP-${item.id.slice(0, 6).toUpperCase()}`,
  };
}

type CatalogValue = {
  products: Product[];
  departments: Department[];
  settings: StoreSettings | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

const CatalogContext = createContext<CatalogValue | null>(null);

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [raw, setRaw] = useState<ApiProduct[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/catalog`, {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error("The catalogue is temporarily unavailable.");
        const data = await response.json();
        setRaw(data.products ?? []);
        setSettings(data.settings ?? null);
      } catch (thrown) {
        if ((thrown as Error).name !== "AbortError") {
          setRaw([]);
          setError(
            thrown instanceof Error
              ? thrown.message
              : "The catalogue is temporarily unavailable.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [version]);

  const products = useMemo(() => raw.map(toProduct), [raw]);

  const departments = useMemo(() => {
    const names = Array.from(
      new Set(products.map((product) => product.department)),
    );
    const order = Object.keys(departmentCopy);
    names.sort((a, b) => {
      const rank = (name: string) => {
        const index = order.indexOf(name);
        return index === -1 ? order.length : index;
      };
      return rank(a) - rank(b) || a.localeCompare(b);
    });
    return names.map((name) => ({
      name,
      slug: slugify(name),
      short: departmentCopy[name]?.short ?? name,
      blurb: departmentCopy[name]?.blurb ?? '',
      photo: departmentPhoto[name] ?? null,
      count: products.filter((product) => product.department === name).length,
    }));
  }, [products]);

  const value = useMemo(
    () => ({
      products,
      departments,
      settings,
      loading,
      error,
      retry: () => setVersion((current) => current + 1),
    }),
    [products, departments, settings, loading, error],
  );

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error("useCatalog must be used within CatalogProvider");
  return value;
}

/** Free text match across name, department, unit and reference. */
export function matches(product: Product, term: string) {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  const haystack =
    `${product.name} ${product.department} ${product.unit} ${product.ref} ${product.description}`.toLowerCase();
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}

export const inDepartment = (products: Product[], slug: string) =>
  products.filter((product) => product.departmentSlug === slug);

export const relatedTo = (products: Product[], product: Product, limit = 4) =>
  products
    .filter(
      (item) =>
        item.id !== product.id && item.department === product.department,
    )
    .slice(0, limit);
