import signsLg from '../assets/stock/signs-lg.webp';
import signsSm from '../assets/stock/signs-sm.webp';
import shirtsLg from '../assets/stock/shirts-lg.webp';
import shirtsSm from '../assets/stock/shirts-sm.webp';
import stickersLg from '../assets/stock/stickers-lg.webp';
import stickersSm from '../assets/stock/stickers-sm.webp';
import mugsLg from '../assets/stock/mugs-lg.webp';
import mugsSm from '../assets/stock/mugs-sm.webp';
import eventsLg from '../assets/stock/events-lg.webp';
import eventsSm from '../assets/stock/events-sm.webp';

/**
 * The photo on each "What are we printing?" card. These are free-licence
 * stock photos (Pexels), standing in until Vikipat's own work photos arrive:
 * they show the kind of job, not Vikipat's finished work, so no caption or
 * alt text claims otherwise. Sources are listed in docs/photo-credits.md.
 * To swap one for a real photo, replace the two files in src/assets/stock/
 * (720 px and 1400 px wide) or change the imports here.
 */
export type ServiceImage = {
  /** Small (720 px) and large (1400 px) versions, used as a srcset. */
  sm: string;
  lg: string;
  alt: string;
  /** CSS object-position, to keep the subject in frame when the card crops. */
  position?: string;
  /** Intrinsic size of the large file, so the layout does not jump. */
  width: number;
  height: number;
};

export const serviceImages: Record<string, ServiceImage> = {
  signs: {
    sm: signsSm,
    lg: signsLg,
    alt: 'Colourful printed banners hung on the columns of a building',
    position: '50% 45%',
    width: 1400,
    height: 1050,
  },
  shirts: {
    sm: shirtsSm,
    lg: shirtsLg,
    alt: 'A man in a black T-shirt with a printed design',
    position: '50% 58%',
    width: 1400,
    height: 2100,
  },
  stickers: {
    sm: stickersSm,
    lg: stickersLg,
    alt: 'A sheet of colourful printed stickers',
    position: '50% 40%',
    width: 1400,
    height: 2100,
  },
  gifts: {
    sm: mugsSm,
    lg: mugsLg,
    alt: 'Two plain white ceramic mugs on a wooden crate',
    position: '50% 50%',
    width: 1400,
    height: 933,
  },
  events: {
    sm: eventsSm,
    lg: eventsLg,
    alt: 'A decorated event backdrop with flowers and lettering',
    position: '50% 50%',
    width: 1400,
    height: 933,
  },
};
