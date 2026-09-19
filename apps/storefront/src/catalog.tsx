import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { slugify } from "./lib/format";

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
  image: string;
  imageAlt: string;
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
 * Departments carry editorial artwork the API does not hold. A department only
 * appears once it has products, so an empty one never renders.
 */
const departmentArt: Record<
  string,
  Omit<Department, "name" | "slug" | "count">
> = {
  Labels: {
    short: "Labels",
    blurb: "Product labels, stickers and precision-cut brand details.",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1400&q=88",
    imageAlt: "Custom printed product labels",
  },
  Packaging: {
    short: "Packaging",
    blurb: "Boxes, sleeves, bags and packaging that completes the experience.",
    image:
      "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=1400&q=88",
    imageAlt: "Premium product packaging",
  },
  DTF: {
    short: "DTF",
    blurb: "Vibrant, durable garment transfers for apparel of every scale.",
    image:
      "https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=1400&q=88",
    imageAlt: "Custom printed apparel",
  },
  "Large Format": {
    short: "Large format",
    blurb: "Banners, signs and displays engineered to hold attention.",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=88",
    imageAlt: "Branded display materials in a modern studio",
  },
  "Corporate Branding": {
    short: "Corporate",
    blurb: "Consistent print, uniforms and marketing material for organisations.",
    image:
      "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1400&q=88",
    imageAlt: "Corporate branding and stationery",
  },
  Souvenirs: {
    short: "Souvenirs",
    blurb: "Mugs, totes, notebooks and gifts people remember.",
    image:
      "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1400&q=88",
    imageAlt: "Custom branded souvenirs",
  },
  Events: {
    short: "Events",
    blurb: "Invitations, backdrops, apparel and coordinated event branding.",
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=88",
    imageAlt: "Professionally branded event",
  },
};

const fallbackArt = {
  short: "Department",
  blurb: "Selected lines held in this department.",
  image:
    "https://images.unsplash.com/photo-1543083477-4f785aeafaa9?auto=format&fit=crop&w=1400&q=88",
  imageAlt: "A stocked shop aisle",
};

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000/api"
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
  out: "Out of stock",
};

/** Shown in place of a product photo when the catalogue entry has none yet. */
export const FALLBACK_PRODUCT_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'%3E%3Crect width='600' height='600' fill='%23F1F3F9'/%3E%3Cg fill='none' stroke='%23B7BEDA' stroke-width='10'%3E%3Crect x='140' y='170' width='320' height='260' rx='16'/%3E%3Ccircle cx='230' cy='250' r='28'/%3E%3Cpath d='M140 380l100-90 90 70 60-50 70 70'/%3E%3C/g%3E%3C/svg%3E";

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
    const order = Object.keys(departmentArt);
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
      ...(departmentArt[name] ?? fallbackArt),
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
