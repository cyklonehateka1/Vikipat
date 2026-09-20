/**
 * "What are you making?" — the entry point into the print configurator.
 * Each outcome is a plain-English job a customer walks in with; it maps to
 * the material `outcomes` tags the API serves on each PrintMaterial. This is
 * pure navigation/editorial — no prices or material facts live here.
 */
export interface SizePreset {
  label: string;
  width: number;
  height: number;
  unit: "ft" | "in";
}

export interface Outcome {
  slug: string;
  label: string;
  blurb: string;
  presets: SizePreset[];
}

export const OUTCOMES: Outcome[] = [
  {
    slug: "shop-signage",
    label: "Shop & business signage",
    blurb: "Storefronts, shop signs, A-frames and durable outdoor boards.",
    presets: [
      { label: "Shop sign", width: 8, height: 4, unit: "ft" },
      { label: "A-frame insert", width: 2, height: 3, unit: "ft" },
      { label: "Roadside board", width: 10, height: 8, unit: "ft" },
    ],
  },
  {
    slug: "events-backdrops",
    label: "Events & backdrops",
    blurb: "Step-and-repeat walls, stage backdrops, flags and pop-up banners.",
    presets: [
      { label: "Roll-up banner", width: 2.7, height: 6.5, unit: "ft" },
      { label: "Backdrop", width: 8, height: 8, unit: "ft" },
      { label: "Teardrop flag", width: 2, height: 8, unit: "ft" },
    ],
  },
  {
    slug: "vehicle-glass",
    label: "Vehicle & glass branding",
    blurb: "Car doors, rear windows, shopfront glass and privacy film.",
    presets: [
      { label: "Car door", width: 3, height: 2, unit: "ft" },
      { label: "Rear window", width: 4, height: 2, unit: "ft" },
      { label: "Shopfront glass", width: 6, height: 4, unit: "ft" },
    ],
  },
  {
    slug: "stickers-labels",
    label: "Stickers & labels",
    blurb: "Product labels, packaging decals and custom die-cut shapes.",
    presets: [
      { label: "Small label", width: 3, height: 2, unit: "in" },
      { label: "Jar / bottle label", width: 4, height: 4, unit: "in" },
      { label: "Laptop decal", width: 12, height: 8, unit: "in" },
    ],
  },
  {
    slug: "indoor-decor",
    label: "Indoor prints & decor",
    blurb: "Framed art, photo walls and presentation-grade fine art prints.",
    presets: [
      { label: "A3 print", width: 11.7, height: 16.5, unit: "in" },
      { label: "Framed portrait", width: 2, height: 3, unit: "ft" },
      { label: "Canvas wall art", width: 3, height: 2, unit: "ft" },
    ],
  },
];

export const outcomeBySlug = (slug: string) =>
  OUTCOMES.find((o) => o.slug === slug);
