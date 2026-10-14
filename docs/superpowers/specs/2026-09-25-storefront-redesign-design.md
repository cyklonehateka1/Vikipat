# Storefront redesign: "Counter", phone first

Date: 2026-09-25
Status: approved to build (owner said "go ahead and do what you have to do")
Mockup for client review: https://claude.ai/artifact/19KN5t2vSTDEbFqQdWLZpK
Replaces the storefront parts of `design.md` and `docs/VIKIPAT_UI_REDESIGN_PLAN.md`. Admin and API are out of scope.

> **Round 2 (same day): the visual design below is superseded.** The client kept only the floating bottom tab bar and rejected the rest (cramped, weak fonts, no motion, dull colours). The page structure, flows, copy rules and API contracts in this spec still hold. The visual system was rebuilt as two complete looks, CMYK Pop and Midnight Foil, for the client to choose between. `design.md` describes them. The "Colour", "Typography" and "Shape and motion" choices below (navy and royal, Archivo) are no longer used.

## Why

The client said the storefront feels like a template, is not beautiful, and is hard to use on a phone. The code shows why:

- The home page stacks about ten competing sections (marquee, stamps, docket trail, swatch fan, bento, ledger, two CTA banners).
- Phones get three stacked bars before content, and navigation hides behind a hamburger.
- The cart has five names ("quote list", "order list", "Order & Jobs", "Checkout & Order Now", "Bag").
- Stock Unsplash photos are captioned as Vikipat's own work.
- Facts contradict each other: East Legon vs Mallam–Gbawe Road, "nothing is charged online" next to a Paystack checkout, cards listed but disabled, invented "Net 30" terms.
- Five reskins have piled up: about 5,000 lines of CSS in 9 files, alias variables (`--plum`, `--teal`), Inter everywhere, heavy inline styles.

## Who it is for and what success looks like

Customers are small businesses, churches, schools, event and funeral families and corporate buyers in Ghana, mostly on Android phones on mobile data, used to WhatsApp and Mobile Money.

Success:

1. From the home screen, one tap starts any order.
2. A price is visible before any commitment: on the home tiles, on every product card and live in the print flow.
3. Every screen has one obvious next step, in thumb reach.
4. Nothing on the site is invented or contradictory.
5. It works at 360 px wide with no sideways scrolling, and the Android back button walks back through steps.

## Decisions (agreed with the owner)

- Structure: "Counter", task-first (chosen over portfolio-led and retail-catalogue options).
- Photography: real client photos. Until they arrive, banner crops of real Vikipat work fill the slots we have, and the rest show a quiet branded placeholder. Dev builds label missing photos so the team knows what to shoot; production never shows the word "Photo".
- Brand: stays with the logo and banner, navy and royal blue with the four dots. No rebrand.
- Commerce: Paystack Mobile Money checkout is the main path; WhatsApp is the "ask us" and "send instead" path. All current features stay.

## Visual system

- Colour: ink `#0D123A` (text, dark panels), royal `#2436C4` (brand surface, the one main button per screen), paper `#F4F5FA` (page ground), white (cards, sheets), line `#DDE0EC`, muted `#50567A`. Errors `#B3261E`, success text `#17632D`.
- The four logo dots (`#1177BF`, `#2EA54A`, `#F38432`, `#C42A5C`) mean progress: they light up in turn as an order moves through Paid, Artwork, Printing, Ready. They also form the loader, and orange marks the cart count. Nowhere else. Colour elsewhere comes from the photos.
- Type: Archivo in two widths. Condensed 800 for display, titles and prices (echoes the tall wordmark and Accra shop signs); normal width for everything else. Body is 16 px minimum on phones. Prices use tabular figures.
- Shape: pill buttons and chips, 18 px cards, 24 px panels and sheets. Shadows only on floating layers (tab bar, sticky bars, sheets, hero tiles).
- The bold moment: the royal-blue hero with the slanted bottom edge (the logo's diagonal) and "What are we printing today?". Everything else is quiet.
- Motion: only transform and opacity, 150 to 250 ms, used for press feedback, sheets, toasts and the size preview. All of it turns off under reduced motion.

## App shell

- Phones and tablets (< 1024 px): a white top bar (logo or page title, back button on inner pages, search and WhatsApp buttons) and a bottom tab bar: Home, Print, Shop, Track, Cart (with count). Focused flows (print steps, checkout) replace the tab bar with a sticky price or pay bar.
- Desktop (1024 px and up): one header with logo, Print, Shop, Track order, Help, search field, WhatsApp and Cart. No tab bar. Full footer.
- Search opens a full-screen sheet on phones, with live product suggestions.
- "Added to cart" shows a toast above the tab bar with a "View cart" action instead of opening a drawer.

## Screens

- Home (`/`): the hero with six job tiles (Banners & signs, Shirts & polos, Stickers & labels, Mugs & gifts, Event backdrops, Car & glass), each showing a live "From GH₵…" price. Then Track and WhatsApp shortcuts, "How ordering works" (three real steps), "Fresh from the workshop" photo strip, "Ready to order" featured products, the workshop panel (address, hours, call, WhatsApp, directions), footer.
- Print (`/print`): choose a job, then size and quantity (material card with Change sheet, size presets, custom size, ft/in, person-for-scale preview, stepper), then artwork (upload, link, design it for me, send later, notes). The live price bar is always visible. Each step is a history entry (`?step=`), so the phone's back button goes back a step. Adding a job goes to the cart.
- Shop (`/shop`, `/department/:slug`, `/search`): one screen. Search field, category chips, count, a Sort sheet with an in-stock toggle, a two-column product grid. Old URLs keep working.
- Product (`/product/:id`): photo, category, name, price per unit, stock, description, quantity, artwork, pickup and payment facts, WhatsApp question link, related products. Sticky bar with the live total and Add to cart; sold-out items switch the bar to "Ask on WhatsApp".
- Cart (`/cart`; `/list` redirects): print jobs and products with quantity, remove with undo, summary, "Checkout" sticky bar, and "Send this order on WhatsApp instead".
- Checkout (`/checkout`): one page. Collapsible summary; your details; pickup or delivery; Mobile Money. Inline validation, focus moves to the first problem. The button says what happens: "Pay GH₵…" normally, "Send order for review" when a design fee needs confirming (the API takes no payment in that case). Price-change recovery is kept exactly as it works now.
- Confirmation (`/confirmation`): order number with copy, payment status, the four-dot progress, what happens next, Track this order (pre-filled) and WhatsApp.
- Track (`/track-order`): order number and email, then the six-digit code, then status with four-dot progress, items, totals and the update timeline. Fields pre-fill from the confirmation link.
- Help (`/faq`), About (`/about`), Contact (`/contact`): the same shell, honest copy. Contact keeps the quote form (upload, validation, WhatsApp hand-off) and the contact directory.
- Not found: a short message with ways back.

## Architecture

Kept as is: `catalog.tsx` (data), `order.tsx` (cart state and storage keys, so existing carts survive), `lib/calculator.ts`, `lib/format.ts`, `lib/sorting.ts`, `lib/useMaterials.ts`, `lib/useOverlay.ts`, `types/pricing.ts`, `outcomes.ts`, and every API call and payload.

Changed:

- `catalog.tsx`: departments lose their Unsplash art; they use the photo registry or their first product's image.
- `site.ts`: copy fixes; `data.ts` FAQ rewritten to match how ordering and payment really work.
- New `content/photos.ts` (one place to drop in client photos) and `content/services.ts` (the home tiles).
- New shell and shared components: `AppShell` (top bar, tab bar, desktop header, footer), `Sheet`, `Toast`, `SearchSheet`, `Dots` (loader and order progress), `Price`, `Stepper`, `ProductCard`, `ProductGrid`, `StatusPanel` (loading, empty and error states).
- `PrintConfigurator` split into step components with a shared price bar.
- Pages rewritten against the new components. Routes are lazy-loaded except Home.
- CSS replaced: `tokens.css`, `base.css`, `components.css`, `shell.css`, `pages.css`. Mobile-first `min-width` queries at 640 and 1024 px, flat single-class selectors, no inline styles except values computed at run time.
- `motion` is no longer imported (CSS does the little motion there is), which shrinks the bundle for mobile data.

## Error, empty and loading states

- The catalogue and materials show skeletons while loading, an error with "Try again" and a WhatsApp fallback when the API fails, and an empty state with a way out.
- Uploads show progress, success with the file name, and a specific error.
- Checkout and tracking errors appear next to the field or above the button in plain words, with focus moved there.
- Server estimates fall back to the local calculator, as now.

## Accessibility and quality floor

Skip link; visible focus ring; labels on every field; 44 px minimum targets; `aria-current` on navigation; `aria-live` on price and cart changes; headings in order; reduced motion respected; contrast at AA or better; safe-area padding for the tab bar and sticky bars; no horizontal scroll at 360 px.

## Testing

- `npm run build` for the storefront (TypeScript and Vite).
- A local mock API serving the seed catalogue, materials, estimates, orders and tracking, so every screen can run without Postgres.
- Screenshots at 360, 390, 768 and 1440 px of every route and state, reviewed and fixed before handing over.
- Walk the main paths: home tile to print job to cart to checkout; shop to product to cart; tracking with a code; back button through print steps.

## Not in this change

Admin and API code; dark mode (the brand is light); accounts; card payments; the real client photos (slots are ready for them).
