# Design — Vikipat storefront

The visual system for the customer storefront (`apps/storefront`), round 3 (September 2026). Rounds 1 and 2 were rejected by the client, so nothing from them is used. Reasoning and trade-offs: `docs/superpowers/specs/2026-09-25-storefront-round3-design.md`. Tokens live in `apps/storefront/src/styles/tokens.css`; this file is the summary.

## Direction
A light, photography-led shop with one hero moment. The look was steered by real references (Sticker Mule, Vistaprint, Printful, Glovo, and a heavy-type hero the owner supplied): moderate type sizes, clear buttons, big product photos, one strong accent, plenty of space.

## Type
- Hero headline only: Anton (heavy condensed), in the hero of the home page.
- Headings: Montserrat 700 to 800 (the face on Vikipat's own banner), sentence case, tight tracking.
- Everything else, including prices: Inter, 17 px body, tabular figures for prices. (Montserrat has no cedi sign, so prices use Inter.)

## Colour
- Chalk `#F2F2EF` ground, chalk-2 `#E8EBE1` filled cells, white for forms.
- Ink `#0E1B14` for text. Muted `#5B685F`.
- Signal orange `#FF6B1A` is the one action colour (`--sun` in the tokens). Ink text sits on it. For orange text on chalk use `--orange-text` `#EA580C`, and only at display sizes.
- Deep leaf `#082F21` for the tab dock, price bar, "How ordering works" band and footer. Leaf `#0B4A33`.
- The logo's four dot colours mean order progress and the loader only.
- Dark bands use the `.on-dark` class, which flips the semantic colours.

## Shape and depth
28 px cells with 8 px padding, so photos inside have a 20 px radius. Pill buttons. Very soft shadows on floating layers only (`--lift`, `--float`). No hard shadows, no borders on cells. The "tactile" button (`.btn-tactile`) is the home hero's dark keycap with an orange corner.

## Navigation
Phones: a floating deep-leaf dock (Home, Print, Shop, Track, Cart) with an orange blob on the current tab. The price and pay bars are the same capsule. Desktop (1024 px and up): one sticky header; at 1024 to 1199 px the WhatsApp button shrinks to an icon.

## Motion
- Route changes use View Transitions (React Router `viewTransition`): the dock stays put, the blob slides, and a product photo morphs from card to product page. Unsupported browsers switch instantly.
- Hero: headline words rise, vector cards eject from a dark tray, the toggle in the headline slides on, and icon tiles, a shirt, a sticker and a swatch card pop in and float (the last three from desktop up); on phones the hero shows only the framed card fan and two small tiles. The hero uses vector objects only, no photographs, and keeps to a headline, one line of text and one button.
- Add to cart bursts orange, green and white dots. Prices count to their new value. Bottom sheets drag with velocity (`motion`, loaded with the sheets only).
- Everything respects `prefers-reduced-motion`.

## Home page below the hero
"What are we printing?" uses six sharp photos (free-licence stock for now, see `docs/photo-credits.md`), zooming in on reveal, drifting slowly and pushing in on hover. The rest is vector illustration: three illustrated ordering steps (`HomeArt.tsx`) joined by a dashed line that draws itself in, a stylised street map with a bouncing pin for the workshop, and poster-face section titles with one orange phrase. Product cards still use the catalogue's own product images. Buttons are flat: no outlines thicker than a hairline and no inset or drop shadows.

## Quick price
The calculator (`QuickPrice.tsx`, `quickprice.css`) is a white panel like the services one, with the steps on the left and one dark price card on the right. The selected job or option turns solid ink; the price card is the single emphasised dark surface. It prices with the same functions as the print flow and hands its choices over through URL parameters.

## Homepage plan
The section order and what each section does live in `docs/homepage-sections.md`. Follow that file when adding or changing sections.

## Rules
- Use semantic tokens, never raw hex, in components.
- Touch targets at least 44 px. Check every change at 360 px and at 1024 px (the header is tightest there).
- Put `-webkit-backdrop-filter` before `backdrop-filter`; the minifier can drop the standard one otherwise.
- Voice: plain, sentence case, from the customer's side. The basket is "Cart". No invented facts, metrics or stock photos.
- Photos live in `src/content/photos.ts`. Current images are crops of the Vikipat banner (`src/assets/work/`). Replace them with real work photos when they arrive.

## Preview build
`npm run build:demo` in `apps/storefront` writes `dist-demo/vikipat-demo.html`: one file with sample data and hash routing, no server needed.
