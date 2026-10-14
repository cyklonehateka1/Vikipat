import type { PhotoKey } from './photos';

/**
 * The job cards under "What are we printing?". Each one either starts a print
 * job (priced per square foot, see outcomes.ts) or opens the shop at the
 * matching catalogue departments. Prices shown on the cards are read live from
 * the API, never written here. The first three are the big illustrated cards;
 * the rest are compact.
 */
type Base = { id: string; label: string; blurb: string; feature?: boolean; photo: PhotoKey };

export type Service =
  | (Base & { kind: 'print'; outcome: string })
  | (Base & { kind: 'shop'; departments: string[] });

export const services: Service[] = [
  {
    id: 'signs',
    label: 'Banners & signs',
    blurb: 'Storefronts, shop signs, A-frames and durable outdoor boards.',
    feature: true,
    photo: 'signs',
    kind: 'print',
    outcome: 'shop-signage',
  },
  {
    id: 'shirts',
    label: 'Shirts & polos',
    blurb: 'DTF-printed T-shirts and embroidered polos for teams and events.',
    feature: true,
    photo: 'shirts',
    kind: 'shop',
    departments: ['DTF', 'Corporate Branding'],
  },
  {
    id: 'stickers',
    label: 'Stickers & labels',
    blurb: 'Product labels, packaging decals and custom die-cut shapes.',
    feature: true,
    photo: 'stickers',
    kind: 'print',
    outcome: 'stickers-labels',
  },
  {
    id: 'gifts',
    label: 'Mugs & gifts',
    blurb: 'Personalised mugs, tote bags and gifts with your print.',
    photo: 'mugs',
    kind: 'shop',
    departments: ['Souvenirs'],
  },
  {
    id: 'events',
    label: 'Event backdrops',
    blurb: 'Step‑and‑repeat walls, stage backdrops, flags and pop‑up banners.',
    photo: 'events',
    kind: 'print',
    outcome: 'events-backdrops',
  },
];
