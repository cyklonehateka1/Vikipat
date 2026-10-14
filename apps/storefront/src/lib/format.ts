import { site } from '../site';

/**
 * Print job prices are whole cedis and show without decimals (GH₵85). Product
 * prices set by staff may have pence and show exactly 2 decimals (GH₵85.50).
 */
export const amount = (value: number) => {
  const pesewas = Math.round(value * 100);
  return (pesewas / 100).toLocaleString('en-GH', pesewas % 100 === 0
    ? { maximumFractionDigits: 0 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

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

/** Compact on-screen price, e.g. GH₵1,250 or GH₵12.50. */
export const cedis = (value: number) => `GH₵${amount(value)}`;

export const cedisFromPesewas = (pesewas: number) => cedis(pesewas / 100);

/** A per-square-foot rate, e.g. GH₵2.60 per sq ft. */
export const ratePerSqFt = (pesewas: number) => `GH₵${(pesewas / 100).toFixed(2)} per sq ft`;

export const mapsLink = site.mapsUrl;

/** "1 shirt" reads as "per shirt"; "100 labels" as "per 100 labels". */
export function perUnit(unit: string) {
  const clean = (unit || 'item').trim();
  if (/^per\s/i.test(clean)) return clean;
  return `per ${clean.replace(/^1\s+/, '')}`;
}

/** "10 shirts" style quantity for a product unit like "1 shirt". */
export function quantityOf(unit: string, qty: number) {
  const clean = (unit || 'item').trim();
  const single = clean.replace(/^1\s+/, '');
  if (/^1\s+/.test(clean) && !/^per\s/i.test(clean)) {
    return `${qty} ${qty === 1 ? single : single.endsWith('s') ? single : `${single}s`}`;
  }
  return `${qty} × ${clean.replace(/^per\s+/i, '')}`;
}

/** Opens WhatsApp with a friendly first line already typed. */
export const greetingLink = whatsappLink(`Hello ${site.name}, I have a question about a print job.`);
