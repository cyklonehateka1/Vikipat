/**
 * Canonical large-format print materials. This is the single source of truth
 * for what the storefront can sell — rates, copy and outcome tags all live
 * here (and from here, in the `service_price_rules` table). The storefront
 * has no material data of its own; it fetches this from GET /catalog/print-materials.
 *
 * `outcomes` are the customer-facing "what are you making" categories used to
 * drive material recommendations — see OUTCOMES in the storefront's outcomes.ts.
 */
export interface CanonicalMaterialSeed {
  code: string;
  name: string;
  material: string;
  category: 'banner' | 'sticker' | 'board' | 'fabric' | 'finish';
  calculator: string;
  employeeRatePesewas: number;
  marketerRatePesewas: number;
  walkInRatePesewas: number;
  onlineRatePesewas: number;
  designMinimumPesewas: number;
  roundingMode: 'nearest_cedi' | 'up_to_cedi' | 'exact_pesewa';
  active: boolean;
  description: string;
  typicalUses: string;
  badge?: string;
  outcomes: string; // comma-separated outcome slugs
  imageUrl?: string;
  sortOrder: number;
}

const rate = (pesewas: number) => ({
  employeeRatePesewas: pesewas,
  marketerRatePesewas: pesewas,
  walkInRatePesewas: pesewas,
  onlineRatePesewas: pesewas,
});

export const CANONICAL_MATERIALS: CanonicalMaterialSeed[] = [
  {
    code: 'flexy-banner', name: 'Flexy / Banner (Outdoor & Indoor)', material: 'flex', category: 'banner',
    calculator: 'large_format_area', ...rate(260), designMinimumPesewas: 10000, roundingMode: 'nearest_cedi', active: true,
    description: 'Heavyweight weatherproof flex banner with reinforced hem and brass eyelets.',
    typicalUses: 'Roadside billboards, event backdrops, church & shop front signage',
    badge: 'Popular', outcomes: 'shop-signage,events-backdrops', sortOrder: 1,
  },
  {
    code: 'sav-sticker', name: 'SAV / Vinyl Sticker', material: 'vinyl', category: 'sticker',
    calculator: 'large_format_area', ...rate(240), designMinimumPesewas: 10000, roundingMode: 'nearest_cedi', active: true,
    description: 'Self-adhesive vinyl for vibrant indoor/outdoor branding and custom decals.',
    typicalUses: 'Product labeling, packaging, wall murals, window decals',
    badge: 'Most Versatile', outcomes: 'stickers-labels', sortOrder: 2,
  },
  {
    code: 'oneway-vision', name: 'Oneway Vision (Perforated Vinyl)', material: 'perforated-vinyl', category: 'sticker',
    calculator: 'large_format_area', ...rate(630), designMinimumPesewas: 10000, roundingMode: 'nearest_cedi', active: true,
    description: 'Micro-perforated film: full-colour graphics outside, see-through from inside.',
    typicalUses: 'Vehicle rear windows, shop glass fronts, office privacy branding',
    badge: 'Premium', outcomes: 'vehicle-glass', sortOrder: 3,
  },
  {
    code: 'transparent-sav', name: 'Transparent SAV', material: 'clear-vinyl', category: 'sticker',
    calculator: 'large_format_area', ...rate(410), designMinimumPesewas: 10000, roundingMode: 'nearest_cedi', active: true,
    description: 'Clear see-through vinyl with rich pigment print for modern glass aesthetics.',
    typicalUses: 'Glass doors, transparent packaging, minimalist window displays',
    outcomes: 'vehicle-glass,stickers-labels', sortOrder: 4,
  },
  {
    code: 'reflective-sav', name: 'Reflective SAV (High Visibility)', material: 'reflective-vinyl', category: 'sticker',
    calculator: 'large_format_area', ...rate(650), designMinimumPesewas: 10000, roundingMode: 'nearest_cedi', active: true,
    description: 'Light-bouncing retroreflective adhesive vinyl for maximum night visibility.',
    typicalUses: 'Road safety signs, fleet graphics, security gate banners',
    outcomes: 'vehicle-glass,shop-signage', sortOrder: 5,
  },
  {
    code: 'blueback', name: 'Blueback Poster Paper', material: 'poster-paper', category: 'banner',
    calculator: 'large_format_area', ...rate(410), designMinimumPesewas: 10000, roundingMode: 'nearest_cedi', active: true,
    description: 'Opaque water-resistant paper with blue reverse to prevent show-through.',
    typicalUses: 'Short-term outdoor billboards, pasting hoardings, high-res posters',
    outcomes: 'events-backdrops,shop-signage', sortOrder: 6,
  },
  {
    code: 'ash-back-pvc', name: 'Ash Back / Rigid PVC Board Print', material: 'pvc-board', category: 'board',
    calculator: 'large_format_area', ...rate(730), designMinimumPesewas: 10000, roundingMode: 'nearest_cedi', active: true,
    description: 'Dense, rigid grey-core board direct print. Lightweight and extremely sturdy.',
    typicalUses: 'Architectural signage, exhibition stands, durable menu boards',
    badge: 'Heavy Duty', outcomes: 'shop-signage,indoor-decor', sortOrder: 7,
  },
  {
    code: 'white-back', name: 'White Back Flex Banner', material: 'flex', category: 'banner',
    calculator: 'large_format_area', ...rate(260), designMinimumPesewas: 10000, roundingMode: 'nearest_cedi', active: true,
    description: 'Clean pure-white back flex banner for crisp, high-contrast graphics.',
    typicalUses: 'Indoor stage backdrops, trade shows, photo walls',
    outcomes: 'events-backdrops,indoor-decor', sortOrder: 8,
  },
  {
    code: 'flag', name: 'Flag Fabric (Wind-Resistant Mesh)', material: 'fabric', category: 'fabric',
    calculator: 'large_format_area', ...rate(580), designMinimumPesewas: 10000, roundingMode: 'nearest_cedi', active: true,
    description: 'Dye-sublimated translucent fabric that flutters gracefully in wind.',
    typicalUses: 'Teardrop flags, feather banners, corporate flagpoles',
    outcomes: 'events-backdrops', sortOrder: 9,
  },
  {
    code: 'photopaper', name: 'Photopaper (High Definition Fine Art)', material: 'photo-paper', category: 'finish',
    calculator: 'large_format_area', ...rate(610), designMinimumPesewas: 10000, roundingMode: 'nearest_cedi', active: true,
    description: 'Ultra-high-definition satin paper for photographic clarity and color range.',
    typicalUses: 'Framed portraits, museum exhibits, presentation graphics',
    outcomes: 'indoor-decor', sortOrder: 10,
  },
  {
    code: 'cutting-sav', name: 'Die-Cut SAV Sticker (Print + Cut)', material: 'vinyl', category: 'sticker',
    calculator: 'large_format_area', ...rate(440), designMinimumPesewas: 10000, roundingMode: 'nearest_cedi', active: true,
    description: 'Precision contour cutting around any custom shape or logo perimeter.',
    typicalUses: 'Custom-shaped jar stickers, laptop decals, branded bottle labels',
    badge: 'Contour Cut', outcomes: 'stickers-labels', sortOrder: 11,
  },
  {
    code: 'cutting-tsav', name: 'Die-Cut Transparent SAV', material: 'clear-vinyl', category: 'sticker',
    calculator: 'large_format_area', ...rate(610), designMinimumPesewas: 10000, roundingMode: 'nearest_cedi', active: true,
    description: 'Contour cutting on clear transparent vinyl films.',
    typicalUses: 'Clear bottle stickers, cosmetic labels, custom window emblems',
    outcomes: 'stickers-labels', sortOrder: 12,
  },
  {
    code: 'cutting-only', name: 'Plotter Cutting Only', material: 'client-supplied', category: 'finish',
    calculator: 'large_format_area', ...rate(180), designMinimumPesewas: 10000, roundingMode: 'nearest_cedi', active: true,
    description: 'Computer-guided blade cutting of client-supplied vinyl media.',
    typicalUses: 'Lettering cutout, vehicle vinyl stencil, decal trimming',
    outcomes: 'stickers-labels', sortOrder: 13,
  },
];
