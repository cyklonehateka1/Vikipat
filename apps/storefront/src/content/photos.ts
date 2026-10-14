import signs from '../assets/work/signs.webp';
import shirts from '../assets/work/shirts.webp';
import stickers from '../assets/work/stickers.webp';
import mugs from '../assets/work/mugs.webp';
import caps from '../assets/work/caps.webp';
import dtf from '../assets/work/dtf.webp';
import embroidery from '../assets/work/embroidery.webp';
import press from '../assets/work/press.webp';
import printer from '../assets/work/printer.webp';

/**
 * Every photo slot on the storefront, in one place. The current images are
 * crops of Vikipat's own shop banner. To add a new client photo: put the file
 * in src/assets/work/, import it above and set `src` on its entry. A slot
 * without `src` shows a quiet placeholder (and, in development only, a note
 * saying which photo is still needed).
 */
export type PhotoKey =
  | 'signs'
  | 'shirts'
  | 'stickers'
  | 'mugs'
  | 'caps'
  | 'dtf'
  | 'embroidery'
  | 'press'
  | 'printer'
  | 'events'
  | 'vehicle'
  | 'indoor'
  | 'packaging';

export type PhotoEntry = {
  src?: string;
  alt: string;
  /** What to photograph for this slot, shown to the team in development. */
  needed: string;
  /** Short caption used in the "Fresh from the workshop" strip. */
  caption?: string;
};

export const photos: Record<PhotoKey, PhotoEntry> = {
  signs: { src: signs, alt: 'An A-frame sign printed at Vikipat', needed: 'a finished shop sign or banner', caption: 'Shop signs' },
  shirts: { src: shirts, alt: 'Branded polo shirts made at Vikipat', needed: 'branded polos', caption: 'Branded polos' },
  stickers: { src: stickers, alt: 'Sheets of printed stickers', needed: 'sticker sheets', caption: 'Sticker sheets' },
  mugs: { src: mugs, alt: 'Personalised birthday mugs', needed: 'printed mugs', caption: 'Birthday mugs' },
  caps: { src: caps, alt: 'A white cap with the Vikipat logo', needed: 'logo caps', caption: 'Logo caps' },
  dtf: { src: dtf, alt: 'A black T-shirt with a full-colour DTF print', needed: 'DTF shirts', caption: 'DTF transfers' },
  embroidery: { src: embroidery, alt: 'The embroidery machine at the Vikipat workshop', needed: 'embroidery work', caption: 'Embroidery' },
  press: { src: press, alt: 'The heat press and DTF printer at the Vikipat workshop', needed: 'the workshop' },
  printer: { src: printer, alt: 'The large-format printer at the Vikipat workshop', needed: 'the large-format printer' },
  events: { alt: 'An event backdrop printed at Vikipat', needed: 'an event backdrop you printed' },
  vehicle: { alt: 'A car branded by Vikipat', needed: 'a branded car or shop window' },
  indoor: { alt: 'A framed print made at Vikipat', needed: 'a framed print or canvas' },
  packaging: { alt: 'Branded packaging made at Vikipat', needed: 'branded boxes or packaging' },
};

/** Photos shown in the home page's "Fresh from the workshop" strip, in order. */
export const workStrip: PhotoKey[] = ['shirts', 'caps', 'dtf', 'mugs', 'stickers', 'embroidery'];

/** The photo that stands for each catalogue department (API category names). */
export const departmentPhoto: Record<string, PhotoKey> = {
  Labels: 'stickers',
  Packaging: 'packaging',
  DTF: 'dtf',
  'Large Format': 'signs',
  'Corporate Branding': 'shirts',
  Souvenirs: 'mugs',
  Events: 'events',
};

/** The photo that stands for each print job in outcomes.ts. */
export const outcomePhoto: Record<string, PhotoKey> = {
  'shop-signage': 'signs',
  'events-backdrops': 'events',
  'vehicle-glass': 'vehicle',
  'stickers-labels': 'stickers',
  'indoor-decor': 'indoor',
};
