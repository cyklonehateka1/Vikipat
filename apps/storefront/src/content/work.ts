import { serviceImages, type ServiceImage } from './serviceImages';

/**
 * PLACEHOLDER DATA for the "Our work" section. The titles, categories and
 * photos are dummy content: the photos are the same free-licence stock photos
 * as "What are we printing?" (see docs/photo-credits.md), so they are not
 * Vikipat's finished jobs. Replace this list with real jobs and client photos
 * (and drop the stock imports) once they arrive.
 */
export type WorkItem = {
  id: string;
  title: string;
  category: string;
  image: ServiceImage;
  /** Where the arrow goes. Placeholder: the print flow for that kind of job. */
  to: string;
};

export const workItems: WorkItem[] = [
  {
    id: 'festival-banners',
    title: 'Festival street banners',
    category: 'Banners and signs',
    image: serviceImages.signs,
    to: '/print?need=shop-signage',
  },
  {
    id: 'team-tees',
    title: 'Printed team T-shirts',
    category: 'Shirts and polos',
    image: serviceImages.shirts,
    to: '/shop',
  },
  {
    id: 'wedding-backdrop',
    title: 'Celebration backdrop',
    category: 'Event backdrops',
    image: serviceImages.events,
    to: '/print?need=event-backdrops',
  },
];
