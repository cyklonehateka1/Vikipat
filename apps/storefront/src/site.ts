/**
 * Single source of truth for business details shown across the storefront.
 * Edit here rather than in individual pages.
 */
export const site = {
  name: "Vikipat",
  fullName: "Vikipat Media Solutions",
  shortName: "Vikipat",
  monogram: "VP",
  tagline: "Commercial Printing & Custom Branding Studio",
  headline:
    "Commercial Printing & Custom Branding, Crafted to Perfection in Accra",
  established: "Accra, Ghana",
  phoneDisplay: "024 236 6523",
  phoneDial: "+233242366523",
  whatsappNumber: "233555110844",
  whatsappDisplay: "055 511 0844",
  whatsappDial: "+233555110844",
  email: "hello@vikipat.com",
  address: {
    line1: "Mallam–Gbawe Road",
    line2: "Opposite Zen Filling Station, Accra",
  },
  deliveryArea: "Accra & Nationwide Ghana",
  hours: [
    { days: "Monday to Friday", time: "08:00 to 18:30" },
    { days: "Saturday", time: "09:00 to 17:00" },
    { days: "Sunday", time: "Online Quotes & Orders" },
  ],
  payment: "Paystack (MTN MoMo / Telecel / AT / Cards) or Bank Transfer",
} as const;

/** Primary navigation, used by the header, mobile sheet, and footer. */
export const nav = [
  { code: "01", label: "Home", to: "/" },
  { code: "02", label: "Start Print Order", to: "/print" },
  { code: "03", label: "Shop Products", to: "/shop" },
  { code: "04", label: "Track Order", to: "/track-order" },
  { code: "05", label: "Ordering & FAQ", to: "/faq" },
  { code: "06", label: "About Studio", to: "/about" },
  { code: "07", label: "Contact", to: "/contact" },
] as const;
