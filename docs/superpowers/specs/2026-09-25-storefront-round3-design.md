# Storefront round 3: light, photo-led shop with a heavy-type hero

Date: 2026-09-25
Status: built. Amended the same day after the owner rejected the first cut: font is Montserrat and Inter (not Anybody), the hero follows a heavy-type reference the owner supplied, and orange replaced yellow as the action colour. Where this file mentions Anybody, sun yellow, the ticker, the seal or scroll-stretching titles, it is out of date; `design.md` is current.
Supersedes: the visual system of `2026-09-25-storefront-redesign-design.md` and both round-2 looks (CMYK Pop, Midnight Foil). Routes, flows, copy rules and API contracts are unchanged.

## Why round 3

The client and the owner rejected round 1 (navy, Archivo), then round 2 (two looks). Both rounds repainted the same layout. The complaints were: cramped, no flair, weak fonts, weak colours, template feel. Round 3 changes the composition, not just the paint.

## Evidence used

- Awwwards, Dribbble, Godly, Mobbin and SiteInspire through the design-inspiration MCP. Useful, if thin: big typographic composition and one strong accent (Niccolo Miranda, Monotype), spring physics for sheets and drawers (animations.dev), shared-layout route transitions (paco.me), bottom tab nav with at most four or five items (Headspace).
- better-design principles: product pages (product image, price and CTA must dominate; one emphasised surface, the buy box), commerce catalog (bounded cells with a filled background, not outlines; density signals price), checkout (no new charges at review, guest path, name the next action), navigation (bottom tabs 3 to 5, active state distinct, never full-screen slide transitions), spacing (start with too much white space), typography (about three sizes per view, tabular figures), animation (springs for gesture-driven motion, ease-out for arrivals, press scale 0.97), mobile (layer sub-tasks as sheets with detents, velocity, one close path).
- ui-ux-pro-max design-system query: "Vibrant and Block-based", green base. Its suggested pink accent and Space Grotesk were not used.
- Rejected on purpose: the "Riso" system from better-design (hard offset shadows and chunky borders, the look already rejected), dark holographic glass, and any navy and royal blue.

## Direction

Named for the thing Ghanaian print shops do best: big, confident sign painting. Flat colour panels like printed sheets, huge condensed poster type, real photographs, and crop marks (the trim marks on a printed sheet) as the one signature detail.

**Colour** (light, warm-neutral, photography-led, which suits an impulse-priced shop):
- Chalk `#F3F4EE` ground, chalk-2 `#E8EBE1` filled cells.
- Ink `#0E1B14` text (green-black, not pure black).
- Leaf `#0B4A33` and deep leaf `#082F21` for the dock, price bar and dark bands.
- Sun `#FFC21A` for the one main action per screen.
- Hibiscus `#D8342A` only for errors and "sold out".
- The four logo dot colours (blue, green, orange, crimson) are kept only for order progress and the loader.

**Type:** Anybody (variable width 50 to 150, weight 100 to 900), condensed and heavy, for display and prices. The width axis animates with scroll on big titles. Instrument Sans for everything else, 17 px body.

**Shape and depth:** 28 px cells with 8 px padding and 20 px inner image radius (inner radius = outer radius minus padding). Pill buttons with a trailing arrow disc. Soft, low shadows on floating layers only. No borders on cells, no hard shadows, no glow.

**Navigation:** phones keep a bottom dock (an app-like tab bar was the one thing liked). It is rebuilt: a deep-leaf capsule, always-labelled tabs, and a sun blob that slides between tabs (a shared-element view transition). The price and pay bars are the same capsule, so one visual family carries every bottom-of-screen control. Desktop: one sticky header with pill navigation.

**Motion:**
- View Transitions between routes: the product photo morphs from card to product page, the dock stays put and its blob slides.
- Hero words rise in; big titles change width as they scroll into view; marquee ticker; crop marks snap in on reveal.
- Add to cart: the button morphs to a check with a spring, and a burst in the new palette fires.
- Bottom sheets drag with velocity handoff and dismiss with the same close path as Escape and Back (`motion`, loaded lazily).
- Cart lines collapse when removed. Prices count to their new value.
- All of it is off under reduced motion.

## Trade-offs

| Choice | Gain | Loss | Fits because |
| --- | --- | --- | --- |
| Open grid and big type | Reads as quality, removes "cramped" | Longer pages, fewer products per screen | The owner's main complaint is cramped, and the shop sells custom work rather than commodity price checks |
| Light, warm ground | Photography-led pages convert best for impulse purchases, products stay the loudest thing | Less "dramatic" than the dark look | Vikipat's photos are colourful, and a dark ground made them compete |
| Sun-yellow main button | One unmistakable action, 12:1 contrast | Yellow is weak on white, so it lives on chalk and dark leaf only | Print shops are visual, and a single strong accent is easy to keep consistent |
| Route transitions | App-like feel, the card-to-page photo morph | Unsupported browsers fall back to an instant switch (nothing breaks) | Most Ghanaian phone traffic is Chrome and Chromium browsers |
| One direction, not two | No hedging, less to maintain | If it misses, the owner has to ask again | Two looks in round 2 both missed for the same layout reasons |

## Constraints (unchanged)

Keep all API contracts and the localStorage keys `vikipat.quote-list.v2` and `vikipat.print-jobs.v2`. No invented facts, metrics or stock photos. Real work photos are still pending (`src/content/photos.ts`). Do not deploy.
