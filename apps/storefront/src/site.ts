/**
 * Single source of truth for business details shown across the storefront.
 * Edit here rather than in individual pages.
 */
export const site = {
  name: 'Vikipat',
  fullName: 'Vikipat Media Solutions',
  tagline: 'Bringing brands to life',
  phoneDisplay: '024 236 6523',
  phoneDial: '+233242366523',
  whatsappNumber: '233555110844',
  whatsappDisplay: '055 511 0844',
  whatsappDial: '+233555110844',
  email: 'hello@vikipat.com',
  address: {
    line1: 'Mallam–Gbawe Road',
    line2: 'Opposite Zen Filling Station, Accra',
  },
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=Zen+Filling+Station+Mallam+Gbawe+Road+Accra',
  deliveryArea: 'Accra and the rest of Ghana',
  hours: [
    { days: 'Monday to Friday', time: '08:00 to 18:30' },
    { days: 'Saturday', time: '09:00 to 17:00' },
    { days: 'Sunday', time: 'Online orders only' },
  ],
  payment: 'Mobile Money (MTN, Telecel or AT) through Paystack',
} as const;

/** Desktop header links. The phone tab bar lives in components/TabBar.tsx. */
export const nav = [
  { label: 'Print', to: '/print' },
  { label: 'Shop', to: '/shop' },
  { label: 'Track order', to: '/track-order' },
  { label: 'Help', to: '/faq' },
] as const;
