import { site } from '../site';

/** Figures render with a subordinate currency mark and tabular numerals. */
export const amount = (value: number) =>
  value.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const money = (value: number) => `GH₵ ${amount(value)}`;

export const pad = (value: number) => String(value).padStart(2, '0');

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const whatsappLink = (message: string) =>
  `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;

export const telLink = `tel:${site.phoneDial}`;

export const deptHref = (slug: string) => `/department/${slug}`;

export const searchHref = (term: string) => `/search?q=${encodeURIComponent(term)}`;
