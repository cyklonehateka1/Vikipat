# Vikipat — Total UI Redesign Plan & AI Design-Tool Prompts
**Status: DRAFT for owner review.** Three apps, three distinct custom design languages — no shared template, no inspiration pulled from existing print-shop/e-commerce platforms, nothing generic. Each app gets its own aesthetic direction, its own typography, its own motion language, and its own standalone prompt block that can be handed directly to Google Stitch, Midjourney/UI tools, v0, or another AI designer — with or without the rest of the project documents — and still produce the intended result.

Companion to `VIKIPAT_PRICING_AND_SERVICE_SPEC_DRAFT.md` (business/pricing logic) and `docs/VIKIPAT_PLATFORM_BUILD_BLUEPRINT.md` (technical architecture). This document covers **visual and interaction design only**.

---

## Why three different languages, not one design system stretched three ways

The three apps serve three different nervous systems:
- **Storefront** — a customer deciding whether to trust a branding company with their money and their brand. It needs to feel *crafted*, tactile, confident — like walking into a print shop that clearly does beautiful work.
- **Staff/Operations console** — someone standing at a machine with ink on their hands, glancing at a screen between jobs. It needs to be scannable in two seconds, unambiguous under bad lighting, and impossible to misread under pressure.
- **Admin/Executive dashboard** — an owner or manager reviewing money and performance. It needs to feel authoritative and calm — a boardroom, not a video game.

Forcing one component library and palette across all three would flatten these into the generic "admin panel" look every SaaS product already has. Instead, each app below has its own typography, palette, motion, and spatial logic — deliberately incompatible with the others, unified only by the same underlying data and by one shared, quiet signature (see "The one shared thread" at the end).

---

# APP 1 — Customer Storefront

## Aesthetic direction: "Wet Ink / Press Proof"
The visual language of a print shop's own best work: cropped-and-trimmed paper edges, registration marks, slightly imperfect ink coverage, the confident scale of a serigraph poster. Not a "printing company website template" — this *feels* like it was printed, then photographed.

- **Tone extreme:** editorial/print-craft, leaning confident and warm rather than corporate.
- **Differentiator people remember:** pages have visible "trim marks" and crop-mark corner brackets on key content blocks (a real print-industry motif, not decoration for its own sake), and the primary accent color behaves like ink — it pools, bleeds slightly at edges via SVG filter, and reacts to press states with a small "impression" effect (content depresses 1–2px like it's been stamped).

## Typography
- Display: **Fraunces** (variable, high-contrast serif with real personality — set at optical size "display", heavy weight, tight tracking) for hero statements and section headers.
- Body/UI: **Archivo** (grotesque, confident, works at small sizes) for body copy, labels, buttons.
- Numerals (prices): tabular lining figures from Archivo, set larger and bolder than surrounding text — prices should never look apologetic.

## Color
- Base: warm paper white `#FAF6EE`, not pure white — has a faint cream warmth like uncoated stock.
- Ink: near-black `#171310` (warm black, not `#000`).
- Signature accent: one saturated "hot ink" color used sparingly but decisively — **vermillion `#E8451F`** (a screen-printing red-orange, not a corporate red). Used for primary CTAs, price highlights, and the crop-mark motif.
- Secondary accent: **cobalt `#1E3A8A`**-adjacent deep blue, used only for the "in production"/status language and department-color-coding for large format vs. apparel vs. packaging service families — never mixed with vermillion in the same component.
- No gradients. Flat ink colors only, occasionally with a subtle halftone-dot texture (SVG pattern, low opacity) as a background fill on section breaks.

## Layout & motion
- Asymmetric grid: hero sections break the grid with an oversized product photo bleeding off one edge while copy sits in a narrower column — like a poster layout, not a centered SaaS hero.
- The service configurator (the "intelligent pricing" flow) is the single most important screen in the app — it should feel like watching a printed quote build itself: each option the customer selects animates in as a new line on a receipt-like price breakdown panel, with a soft paper-shuffle motion (translateY + slight rotate on entry, settling with a spring).
- Product/finish swatches shown as physical material chips with subtle texture (canvas weave for fabric, glossy sheen for vinyl, matte grain for paper) rather than flat color circles.
- Micro-interaction: buttons get a 1–2px "press" translate + shadow-compression on click, referencing a stamping press — not a generic scale/opacity hover.
- One hero-load animation: staggered reveal of hero headline (word by word, like ink hitting paper), then product grid cascades in. Everything else stays calm — no scroll-jacking, no parallax overload.

## Key screens to design
1. Home — hero, service categories (Large Format / Small Format / Apparel & Embroidery / Packaging & Promo / Shop), trust signals (real work photos, not stock imagery), featured products.
2. Service configurator / print estimator — the centerpiece: live specification form on the left, running itemized price receipt on the right, instant vs. "needs review" state clearly distinguished (not hidden in fine print).
3. Shop (DTF film, blank apparel, ready-branded items) — standard grid but styled consistently with the ink/paper language, not a generic Shopify look.
4. Cart/checkout with Paystack handoff — must visibly build trust at the exact moment money changes hands: clear itemization, security messaging, mobile money and card options both visually equal (not card-first bias).
5. Order tracking (OTP-based, no login) — a single clean "receipt" style status page: order number, current stage as a vertical timeline, estimated readiness, contact/help.
6. Product/service detail pages with photo galleries of real finished work.

## Prompt for Google Stitch / any AI UI designer (Storefront)

```
Design a customer-facing e-commerce storefront for VIKIPAT, a printing and branding
company in Accra, Ghana that does large-format printing (banners, vehicle branding,
signage), small-format printing (business cards, flyers, brochures), apparel branding
(DTF, screen printing, embroidery, sublimation), packaging/labels, and promotional
items (mugs, pens, tote bags) — plus a shop selling ready-made supplies like DTF film,
blank apparel and branded shirts.

AESTHETIC DIRECTION — "Wet Ink / Press Proof":
This must NOT look like a generic e-commerce template, a generic AI-generated SaaS
site, or any existing print-on-demand platform. The design concept is: this website
looks and feels like it was itself printed by a master print shop — confident,
tactile, a little imperfect in a deliberate way, like a serigraph poster or a
press proof sheet.

- Background: warm cream/paper white (#FAF6EE), never pure white.
- Ink color / near-black text: #171310 (warm black, not pure black).
- One dominant accent color used decisively and sparingly: a saturated
  screen-printing vermillion/orange-red, #E8451F — used for primary buttons, price
  callouts, and small "crop mark" / registration-mark corner brackets that appear on
  key content cards (a real print-industry visual motif — thin L-shaped corner
  brackets like a designer's crop marks, not generic decorative shapes).
- A secondary deep cobalt blue is used only for status/production language, never
  combined with the vermillion in the same card.
- NO gradients. NO purple. NO glassmorphism. Flat, confident ink colors. A very
  subtle halftone-dot texture pattern may appear as a low-opacity background fill on
  section breaks, referencing offset-print screening.
- Typography: pair a high-personality, high-contrast display serif (like Fraunces,
  set heavy, at "display" optical size, tight letter spacing) for headlines with a
  confident grotesque sans (like Archivo) for body text and UI labels. Prices are set
  large, bold, tabular — never small or apologetic. Absolutely avoid generic fonts
  like Inter, Roboto, Arial, or default system fonts.
- Layout: asymmetric, poster-like composition on the homepage hero — an oversized
  photograph of real finished print work bleeds off one edge of the viewport while
  the headline and CTA sit in an offset column, not centered. Break the grid
  deliberately in hero and section-break moments; keep product grids clean and
  organized.
- Material/finish selectors (paper stock, vinyl, fabric) should be shown as textured
  material swatches (subtle canvas weave, glossy sheen, matte grain) rather than flat
  color circles.
- Motion: buttons compress 1-2px downward with a shadow change on press (referencing
  a stamping press, not a generic hover-scale). The most important interaction in the
  whole app is the live price estimator: as a customer selects size/material/quantity/
  finishing options, each choice should animate into a running itemized price
  breakdown that behaves like a receipt printing out — new lines slide/settle in with
  a slight paper-shuffle motion. On page load, the hero headline reveals in a
  staggered word-by-word animation like ink striking paper, then the rest of the page
  settles calmly — no scroll-jacking, no excessive parallax.

SCREENS TO DESIGN (mobile-first, then desktop):
1. Home — hero with real print-work photography, service category tiles (Large
   Format, Small Format, Apparel & Embroidery, Packaging & Promo, Shop), trust
   signals, featured products/services.
2. Service configurator / "Print Estimator" — this is the centerpiece screen. Left
   side: step-by-step specification form (service type, size, material, quantity,
   finishing, artwork upload, delivery method). Right side (or bottom on mobile): a
   running itemized price receipt that updates live, clearly showing whether this is
   an "instant price — pay now" job or a "price needs staff confirmation" job (these
   two states must look visually distinct, not buried in fine print — e.g. an instant
   price gets a confident vermillion "Pay now" button, a staff-confirmed job gets a
   clear "Submit for pricing confirmation" secondary-style button with an explanation
   of what happens next).
3. Shop grid — ready-made products (DTF film, blank apparel, branded items) with
   variant selection (size/color), stock status, same visual language as the rest of
   the site.
4. Cart & checkout — itemized order summary, delivery/pickup selection, Paystack
   payment handoff showing mobile money and card as equally prominent options (do not
   default to a card-first Western e-commerce bias), clear security/trust messaging
   at the exact moment of payment.
5. Order confirmation — order number, what happens next, expected timeline.
6. Order tracking page (no login required — customer enters order number + phone/OTP)
   — a single clean vertical timeline showing current production stage in
   customer-friendly language (e.g. "In production" not "Job card #4471 routed to
   Machine 2"), estimated ready date, pickup/delivery details.
7. Individual product/service detail page with a gallery of real finished-work
   photography, use-case examples, and a "start this order" entry into the
   configurator.
8. About/Contact/FAQ pages consistent with the same visual language, not a
   stock corporate afterthought.

TECHNICAL NOTES: Must be fully responsive down to ~360px mobile width. Must work
without JavaScript-heavy parallax that would hurt performance on mid-range Android
phones common in Ghana (many customers will be on mobile data, not desktop). Must
support both light-mode-only design (this concept is inherently a light, warm-paper
aesthetic — do not attempt a dark mode variant for this app).

Do not reference or resemble Printful, Vistaprint, Canva Print, Shopify default
themes, or any other existing print-on-demand or e-commerce platform. Design this as
if no such platform existed before.
```

---

# APP 2 — Staff / Operations Console

## Aesthetic direction: "Production Floor Console"
Built for someone standing, moving, glancing — not sitting comfortably at a desk reviewing spreadsheets. Think aircraft-hangar signage and factory-floor control panels: unambiguous, high-contrast, fast to scan, resilient to bad lighting and quick glances. This is the opposite extreme from the storefront on purpose.

- **Tone extreme:** industrial/utilitarian, dark-mode-first.
- **Differentiator people remember:** job cards read like actual printed work-order tickets/tags (the kind physically clipped to a job in a real print shop) rendered digitally — perforated-edge card styling, a corner "stub", and a bold job-code in a monospace stencil-adjacent font — not a generic kanban card.

## Typography
- UI/body: **IBM Plex Sans** — engineered, legible, purpose-built for dense technical interfaces, humane enough not to feel cold.
- Data/codes (job numbers, SKUs, timestamps, machine IDs): **IBM Plex Mono** — every job number, barcode-adjacent ID, and timer is monospaced so digits align and are scannable at a glance.
- No display/decorative font anywhere in this app — legibility beats personality here entirely.

## Color
- Base: near-black charcoal `#14161A`, true dark mode (this app is used in a workshop, often under mixed/industrial lighting — dark reduces glare and battery drain on shared tablets).
- Text: off-white `#EDEFF2`.
- Status colors follow an unambiguous, high-saturation traffic system, used ONLY for status meaning (never decoratively):
  - Amber `#FFB020` — needs attention / awaiting review / due soon.
  - Red `#FF4D4F` — blocked / overdue / QC failed.
  - Green `#2ECC71` — ready / approved / on track.
  - Blue-grey `#5B7A9D` — informational / in queue, not yet started.
- Surfaces are subtly layered charcoal tones (not pure flat black) to create depth between the job board background, lane columns, and individual job cards, so eyes can parse hierarchy fast without color.

## Layout & motion
- Kanban-style production board as the home screen: columns = production stages (Awaiting Artwork → Approved → Scheduled → In Production → QC → Ready → Dispatched), each job a "ticket" card with the perforated/stub styling described above.
- Large tap targets throughout — this app will be used on shared tablets/shop-floor screens, not precision mouse input.
- A persistent, always-visible "due today / overdue" strip pinned to the top — the single most urgent piece of information must never require scrolling to find.
- Motion is minimal and functional only: status changes trigger a brief color-flash + settle on the affected card (not a page-wide animation), drag-and-drop between lanes has a solid drop-shadow lift and a snap-into-place motion. No decorative animation — every motion communicates a state change.
- Job detail view opens as a full-screen "ticket" — large legible spec block, artwork thumbnail, material/quantity/finishing checklist the operator ticks off physically, QC checklist, and a big unmistakable "Mark complete" / "Flag issue" action pair at the bottom, thumb-reachable on a tablet.

## Key screens to design
1. Production board (kanban, role-filtered — an embroidery operator sees embroidery jobs, not the whole shop).
2. Job ticket detail (full spec, artwork, checklist, actions).
3. "Due today / overdue" priority queue view.
4. Intake/review queue (for ops supervisors reviewing new online + walk-in orders before releasing to production).
5. Walk-in order entry screen (staff creating a new order at the counter — must use the same pricing engine as the storefront, styled for fast counter-side entry with a customer-facing price display).
6. Materials/stock quick-check and consumption logging screen.
7. QC checklist screen with pass/fail/rework capture and photo evidence upload.

## Prompt for Google Stitch / any AI UI designer (Staff/Operations Console)

```
Design an internal staff/operations dashboard app for VIKIPAT, a printing and
branding company workshop in Accra, Ghana. This is used by production staff
(operators, designers, QC, dispatch, supervisors) on shared tablets and desktop
screens on an active factory/print-shop floor — NOT by office workers at a calm desk.

AESTHETIC DIRECTION — "Production Floor Console":
This must look nothing like a generic SaaS admin dashboard, nothing like a
generic Trello/Jira/Asana clone, and nothing like the customer-facing storefront for
this same company (that app is warm, paper-toned, editorial — this app is its
deliberate opposite: cold, dark, industrial, built for split-second legibility, not
charm).

- True dark mode: near-black charcoal background (#14161A), off-white text (#EDEFF2).
  Do not offer or design a light mode for this app.
- Status colors are used ONLY to mean status, consistently, everywhere, at high
  saturation so they read correctly under bad lighting and on cheap tablet screens:
  amber #FFB020 = needs attention/due soon, red #FF4D4F = blocked/overdue/failed QC,
  green #2ECC71 = ready/on track, blue-grey #5B7A9D = queued/not started.
- Typography: IBM Plex Sans for all UI text and labels (legible, engineered, not
  decorative). IBM Plex Mono for every job number, order ID, timestamp, and machine
  ID — these must always be monospaced so digits align in a scannable column. Do NOT
  use any display/decorative typeface anywhere in this app — total legibility over
  personality.
- Signature motif: individual job cards are styled like physical printed work-order
  tickets that would be clipped to a real job in a print shop — give them a
  perforated-edge visual treatment along one side and a small torn/stub corner
  detail, with the job code set large and bold in the monospace font at the top of
  the ticket. This is a specific, deliberate reference to real print-shop paperwork —
  not a generic flat kanban card with a colored top border.
- Layout: the home screen is a kanban-style production board with columns for
  production stages (e.g. Awaiting Artwork, Approved, Scheduled, In Production,
  Quality Check, Ready, Dispatched). A persistent strip pinned to the very top of the
  screen always shows jobs due today or overdue — this must be visible without any
  scrolling, on every screen in the app, because it is the single most
  time-critical piece of information for shop-floor staff.
- Interaction: extra-large tap targets everywhere (this runs on shared tablets with
  gloved or ink-stained fingers, not precision mouse pointers). Drag-and-drop between
  board columns has a strong drop-shadow "lift" while dragging and a firm snap into
  place on drop. Status changes on a card trigger a brief, localized color flash on
  that card only — never a full-page animation or transition. Motion exists only to
  confirm a state change, never for decoration.
- The job detail / "ticket" view opens full-screen with: large legible job
  specification block, artwork thumbnail preview, a physical-feeling tickable
  checklist for material/quantity/finishing steps, a QC checklist section with
  pass/fail toggles and photo-evidence upload, and two large, unmistakable,
  thumb-reachable action buttons at the bottom of the screen: "Mark complete" (green)
  and "Flag issue" (red).

SCREENS TO DESIGN:
1. Production board (kanban view, filterable by department/role — e.g. an embroidery
   operator's view only shows embroidery jobs).
2. Job ticket detail view (full spec + artwork + checklist + QC + actions).
3. "Due today / overdue" priority queue as its own dedicated view.
4. Intake/review queue — where an operations supervisor reviews new orders (from the
   online storefront AND from walk-in customers) before releasing them to production,
   checking artwork, pricing exceptions, and stock availability.
5. Walk-in order entry screen — a fast counter-side interface for staff to create a
   new order for a customer standing in front of them right now, using the same
   service configurator/pricing logic as the customer storefront but styled for rapid
   staff entry (large buttons, minimal typing, a running price total visible to both
   staff and the customer if the screen is turned around).
6. Materials/stock quick-check and consumption-logging screen for storekeepers.
7. QC checklist and rework-capture screen with photo evidence.

TECHNICAL NOTES: Must work well on a 10-inch tablet in landscape orientation as the
primary target, and gracefully scale up to a full desktop monitor for supervisor
use. Assume intermittent lighting conditions and screens that may have fingerprints,
dust or minor glare — contrast and size must be generous, not delicate.

Do not reference or resemble Trello, Jira, Asana, Monday.com, or any generic project
management tool. Design this as a purpose-built print-shop production console that
happens to use kanban-style organization, not a kanban tool reskinned for printing.
```

---

# APP 3 — Admin / Executive Dashboard

## Aesthetic direction: "The Executive Ledger"
The owner/manager's view: calm, authoritative, precise — a beautifully kept financial ledger and a boardroom report, not a "startup analytics dashboard" with cards everywhere and gauges spinning. Confidence expressed through restraint and typographic precision, not through data density or decoration.

- **Tone extreme:** refined/luxury minimalism, editorial finance-report sensibility.
- **Differentiator people remember:** numbers are treated as the hero of the design — set in an elegant serif at a scale and weight normally reserved for headlines, with hairline rules and generous whitespace doing the organizing work instead of boxes and shadows. This is a dashboard that could be printed as a monthly report and look intentional on paper.

## Typography
- Display/numerals: **Newsreader** (a refined, literary serif with excellent numeral forms) set large for key metrics (revenue, margin, orders) — treated as headlines, not small dashboard stat-tile text.
- UI/body/labels: **Inter is explicitly banned per house rule** — use **General Sans** or **Söhne-adjacent** humanist sans (e.g. **Public Sans**) for labels, table text, and navigation — quiet and precise, deliberately receding behind the serif numerals.
- Tabular figures throughout every table and chart axis — financial data must align perfectly.

## Color
- Base: warm off-white/bone `#F7F4EE` in light mode (this app is used in an office, daylight-friendly) — intentionally close to, but distinct from, the storefront's paper tone, as a very subtle visual echo (see shared thread below) without being the same app.
- Ink: deep ink-black `#1B1B1A`.
- One quiet luxury accent: a deep bottle-green `#1F3A2E` or an aged-brass gold `#A67C3D` used sparingly — for the single "north star" metric of any view, positive-trend indicators, and primary action buttons. Never both accents in the same screen; pick bottle-green as primary, brass reserved only for currency/GH₵ callouts.
- Negative/warning states use a muted brick red `#A13D2C` — never a loud alert red; this app should never feel alarming, even when flagging a problem, because panic is not useful to an executive glancing at a phone between meetings.
- Charts: monochrome ink + the one accent color, never a multi-color rainbow chart. Category comparisons use value/opacity variation of the same hue, not distinct colors, so a bar chart of "revenue by service" reads as one coherent voice, not a pie-chart-vendor palette.

## Layout & motion
- Generous whitespace, hairline `1px` rules instead of card borders/shadows to separate sections — the page should feel like turning pages in a well-typeset annual report.
- One primary metric per view given real typographic weight (e.g. "Net revenue this month, GH₵48,230" set at 64px+ in Newsreader) with supporting metrics arranged quietly beneath in a clean table, not a wall of equally-loud stat tiles.
- Charts are understated line/bar forms with minimal gridlines, labeled directly rather than via legend boxes where possible.
- Motion: numbers count up smoothly on load (a single satisfying moment, not a gimmick repeated everywhere); page transitions are simple crossfades; no bouncing, no card-hover-lift effects — restraint is the entire point of this app's motion language.
- Data tables (orders, transactions, staff) styled like ledger pages: alternating extremely subtle row tinting, right-aligned numerals, hairline row dividers, no zebra-striping in loud colors.

## Key screens to design
1. Executive overview — the single most important screen: this month's net revenue as the hero number, orders/AOV/conversion, deposits outstanding, quiet trend line, revenue-by-channel (storefront/walk-in/salesperson) breakdown.
2. Financial detail — Paystack settlement reconciliation, fees, refunds/disputes, tax collected.
3. Service/catalogue performance — revenue and margin by service family, best/worst performers.
4. Staff & production oversight — throughput, on-time delivery rate, machine utilization (phase 2 data, but the screen shell should be designed now).
5. Pricing studio — the versioned pricing-rule editor (draft → test → publish workflow already in the codebase) redesigned in this same ledger language: rule history reads like a document's revision history, not a raw JSON diff.
6. Staff management — roles/permissions list, styled as a personnel register rather than a generic user-table.
7. Customer/order lookup — a calm search-and-detail view for investigating a specific order or customer across all three channels.

## Prompt for Google Stitch / any AI UI designer (Admin/Executive Dashboard)

```
Design an executive/admin dashboard app for VIKIPAT, a printing and branding company
in Accra, Ghana. This is used by the business owner, managers, and finance staff to
oversee revenue, orders, pricing, staff and production performance across three order
channels: the customer storefront, walk-in counter orders, and salesperson-sourced
orders.

AESTHETIC DIRECTION — "The Executive Ledger":
This must NOT look like a generic startup analytics dashboard (no stat-tile grids
with icon badges, no multi-color pie charts, no card-shadow-everywhere SaaS look, no
gauge widgets, no purple gradients). The concept: this dashboard should feel like a
beautifully typeset financial ledger or a monthly boardroom report — calm,
authoritative, and precise, where restraint and typography communicate confidence
instead of dense data-visualization decoration.

- Light mode only, warm off-white/bone background (#F7F4EE), deep ink-black text
  (#1B1B1A). This is an office/daylight app.
- Typography is the entire visual strategy: use a refined literary serif with
  excellent numeral forms (like Newsreader) set LARGE for key metrics — e.g. this
  month's net revenue should be set at headline scale (60px+), treated as the hero of
  the page, not tucked into a small stat card. Use a quiet, precise humanist sans
  (like Public Sans — explicitly NOT Inter, Roboto, or Arial) for labels, navigation
  and table text, deliberately understated so the serif numerals stand out. All
  financial figures use tabular/aligned numerals in every table and chart.
- One quiet luxury accent color: deep bottle-green (#1F3A2E) for primary actions,
  positive trends, and the one "north star" metric per screen. A secondary aged-brass
  gold (#A67C3D) is reserved ONLY for currency (GH₵) callouts — never use both
  accents together in the same view. Negative/warning states use a muted brick red
  (#A13D2C), never a loud alarm red — this dashboard should never feel like it's
  panicking, even when flagging an issue.
- Replace card borders and drop shadows with hairline 1px rules to separate sections
  — the page should read like turning pages in a well-typeset annual report, not
  like stacked dashboard widgets.
- Charts must be understated monochrome line/bar forms using ink + the one accent
  color only — NEVER a multi-color rainbow chart or pie chart with many hues.
  Category comparisons (e.g. revenue by service) should vary opacity/value of one
  hue rather than assigning a different color per category, so a chart reads as one
  coherent visual voice.
- Data tables (orders, transactions, staff, pricing rules) are styled like ledger
  pages: extremely subtle alternating row tint (not loud zebra striping),
  right-aligned numerals, hairline dividers.
- Motion: on page load, key numbers count up smoothly once — a single satisfying
  moment, not repeated everywhere. Page transitions are simple crossfades. No card
  hover-lift effects, no bounce, no gauge animations. Restraint is the entire point
  of this app's motion language.

SCREENS TO DESIGN:
1. Executive overview (home) — hero metric: this month's net revenue in large serif
   numerals, with orders count, average order value, conversion rate, and deposits
   outstanding arranged quietly beneath in a clean layout (not equal-weight stat
   tiles). A single understated trend line. A revenue-by-channel breakdown comparing
   storefront vs walk-in vs salesperson-sourced orders.
2. Financial detail view — Paystack settlement reconciliation, transaction fees,
   refunds and disputes, tax collected, all in the ledger-page table style.
3. Service/catalogue performance — revenue and margin by service family (large
   format, small format, apparel/embroidery, packaging/promo, shop products),
   highlighting best and worst performers without resorting to a busy chart.
4. Staff & production oversight — throughput, on-time delivery rate, and machine
   utilization, designed as a calm operational report rather than a live monitoring
   wall.
5. Pricing studio — a versioned pricing-rule editor with a draft, test, and publish
   workflow. Style the rule revision history like a document's tracked-changes/
   revision history (dates, who changed what, previous vs new value), not a raw
   technical diff view.
6. Staff management — a roles-and-permissions list styled as an elegant personnel
   register, not a generic user-management table with badge icons.
7. Customer/order lookup — a calm search screen for investigating a specific order or
   customer across all three order channels, with a clean detail view of that order's
   full history.

TECHNICAL NOTES: Primary target is desktop/laptop (this is an office/management
tool), but must remain usable on a tablet for an owner checking figures on the move.
Do not design a dark mode for this app.

Do not reference or resemble generic dashboard templates (no Tremor/shadcn default
looks, no Stripe-dashboard-clone, no generic Notion-style database view). Design this
as if it were commissioned as a piece of financial publishing, not as software.
```

---

## The one shared thread across all three apps

Despite being deliberately different design languages, all three should share exactly **three quiet, structural things** so they still feel like one company's software, not three unrelated products:

1. **The same underlying data and terminology** — an order status means the same thing everywhere, just expressed in each app's own visual vocabulary (a customer sees "In production", staff sees the same job on a ticket card, the exec dashboard counts it in a "work in progress" figure).
2. **A single, unifying wordmark treatment for "VIKIPAT"** — set once, in one specific typographic treatment, and used identically (same weight, same tracking, same color rule) as the one fixed logo lockup across all three apps' headers — everything else around it is free to differ completely.
3. **The warm-paper vs. deep-charcoal vs. bone-ledger backgrounds are all, deliberately, off-white or near-black — never pure `#FFFFFF` or pure `#000000` anywhere in any of the three apps.** This is a single, invisible discipline that makes all three feel considered rather than default, without making them look related.

Everything else — typography, accent color, motion, layout logic, even light/dark mode — is intentionally different per app, per the sections above.

---

## Suggested build order

1. Storefront (customer-facing, revenue-generating, highest priority per your original brief).
2. Staff/Operations console (needed the moment the storefront produces its first real order).
3. Admin/Executive dashboard (valuable from day one but can launch with a minimal "overview + pricing studio" slice while the fuller financial-intelligence screens follow in phase 2, consistent with the phased launch priorities already drafted in the pricing/service spec).
