export type DimensionUnit = "ft" | "in";

export interface LargeFormatMaterial {
  code: string;
  name: string;
  category: "banner" | "sticker" | "board" | "fabric" | "finish";
  walkInRatePesewas: number; // e.g. 240 = GH₵ 2.40
  description: string;
  typicalUses: string;
  badge?: string;
}

export const LARGE_FORMAT_MATERIALS: LargeFormatMaterial[] = [
  {
    code: "flexy-banner",
    name: "Flexy / Banner (Outdoor & Indoor)",
    category: "banner",
    walkInRatePesewas: 260,
    description:
      "Heavyweight weatherproof flex banner with reinforced hem and brass eyelets.",
    typicalUses:
      "Roadside billboards, event backdrops, church & shop front signage",
    badge: "Popular",
  },
  {
    code: "sav-sticker",
    name: "SAV / Vinyl Sticker",
    category: "sticker",
    walkInRatePesewas: 240,
    description:
      "Self-adhesive vinyl for vibrant indoor/outdoor branding and custom decals.",
    typicalUses: "Product labeling, packaging, wall murals, window decals",
    badge: "Most Versatile",
  },
  {
    code: "oneway-vision",
    name: "Oneway Vision (Perforated Vinyl)",
    category: "sticker",
    walkInRatePesewas: 630,
    description:
      "Micro-perforated film: full-colour graphics outside, see-through from inside.",
    typicalUses:
      "Vehicle rear windows, shop glass fronts, office privacy branding",
    badge: "Premium",
  },
  {
    code: "transparent-sav",
    name: "Transparent SAV",
    category: "sticker",
    walkInRatePesewas: 410,
    description:
      "Clear see-through vinyl with rich pigment print for modern glass aesthetics.",
    typicalUses:
      "Glass doors, transparent packaging, minimalist window displays",
  },
  {
    code: "reflective-sav",
    name: "Reflective SAV (High Visibility)",
    category: "sticker",
    walkInRatePesewas: 650,
    description:
      "Light-bouncing retroreflective adhesive vinyl for maximum night visibility.",
    typicalUses: "Road safety signs, fleet graphics, security gate banners",
  },
  {
    code: "blueback",
    name: "Blueback Poster Paper",
    category: "banner",
    walkInRatePesewas: 410,
    description:
      "Opaque water-resistant paper with blue reverse to prevent show-through.",
    typicalUses:
      "Short-term outdoor billboards, pasting hoardings, high-res posters",
  },
  {
    code: "ash-back-pvc",
    name: "Ash Back / Rigid PVC Board Print",
    category: "board",
    walkInRatePesewas: 730,
    description:
      "Dense, rigid grey-core board direct print. Lightweight and extremely sturdy.",
    typicalUses:
      "Architectural signage, exhibition stands, durable menu boards",
    badge: "Heavy Duty",
  },
  {
    code: "white-back",
    name: "White Back Flex Banner",
    category: "banner",
    walkInRatePesewas: 260,
    description:
      "Clean pure-white back flex banner for crisp, high-contrast graphics.",
    typicalUses: "Indoor stage backdrops, trade shows, photo walls",
  },
  {
    code: "flag",
    name: "Flag Fabric (Wind-Resistant Mesh)",
    category: "fabric",
    walkInRatePesewas: 580,
    description:
      "Dye-sublimated translucent fabric that flutters gracefully in wind.",
    typicalUses: "Teardrop flags, feather banners, corporate flagpoles",
  },
  {
    code: "photopaper",
    name: "Photopaper (High Definition Fine Art)",
    category: "finish",
    walkInRatePesewas: 610,
    description:
      "Ultra-high-definition satin paper for photographic clarity and color range.",
    typicalUses: "Framed portraits, museum exhibits, presentation graphics",
  },
  {
    code: "cutting-sav",
    name: "Die-Cut SAV Sticker (Print + Cut)",
    category: "sticker",
    walkInRatePesewas: 440,
    description:
      "Precision contour cutting around any custom shape or logo perimeter.",
    typicalUses:
      "Custom-shaped jar stickers, laptop decals, branded bottle labels",
    badge: "Contour Cut",
  },
  {
    code: "cutting-tsav",
    name: "Die-Cut Transparent SAV",
    category: "sticker",
    walkInRatePesewas: 610,
    description: "Contour cutting on clear transparent vinyl films.",
    typicalUses:
      "Clear bottle stickers, cosmetic labels, custom window emblems",
  },
  {
    code: "cutting-only",
    name: "Plotter Cutting Only",
    category: "finish",
    walkInRatePesewas: 180,
    description:
      "Computer-guided blade cutting of client-supplied vinyl media.",
    typicalUses: "Lettering cutout, vehicle vinyl stencil, decal trimming",
  },
];

export interface PrintJobSpec {
  serviceCode: string;
  serviceName: string;
  width: number;
  height: number;
  unit: DimensionUnit;
  quantity: number;
  needsDesign: boolean;
  notes?: string;
}

export interface CalculatedEstimate {
  serviceCode: string;
  serviceName: string;
  width: number;
  height: number;
  unit: DimensionUnit;
  quantity: number;
  areaPerPieceSqFt: number;
  totalAreaSqFt: number;
  ratePesewasPerSqFt: number;
  basePesewas: number;
  designFeePesewas: number;
  totalPesewas: number;
  requiresReview: boolean;
  reviewReasons: string[];
  designMessage: string | null;
  estimateId?: string;
  fingerprint?: string;
}
