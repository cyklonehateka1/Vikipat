# Storefront redesign ("Counter") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild every customer-facing screen of `apps/storefront` as a phone-first, task-first storefront with one coherent visual system, keeping every existing API contract and cart behaviour.

**Architecture:** Keep the data layer (`catalog.tsx`, `order.tsx`, `lib/*`), replace all markup and CSS. A new app shell (top bar + bottom tabs on phones, one header on desktop) wraps lazily loaded pages. Small pure modules (`lib/progress.ts`, `lib/priceHints.ts`, `lib/printSteps.ts`) hold the logic worth testing; UI is verified with a mock API and screenshots.

**Tech Stack:** React 19, React Router 7, Vite, TypeScript, lucide-react, plain CSS with custom properties, Node 23 test runner (`--experimental-strip-types`) for pure modules, Playwright (cached Chromium) for screenshots.

**Spec:** `docs/superpowers/specs/2026-09-25-storefront-redesign-design.md`
**Visual reference:** mockup canvas https://claude.ai/artifact/19KN5t2vSTDEbFqQdWLZpK (each page task names its artboard; match its layout, sizes and copy).

## Global Constraints

- Colours: ink `#0D123A`, royal `#2436C4`, royal pressed `#18258F`, paper `#F4F5FA`, white, line `#DDE0EC`, muted `#50567A`, error `#B3261E`, success text `#17632D`; dots `#1177BF` `#2EA54A` `#F38432` `#C42A5C` used only for order progress, the loader and the cart count.
- Type: Archivo variable (`wdth 62..100`, `wght 400..800`). Display/titles/prices condensed 800 (`font-stretch: 66%–75%`); body 16 px minimum on phones.
- One royal primary button per screen. Buttons and chips are pills; cards 18 px; panels and sheets 24 px.
- Breakpoints: mobile-first, `min-width: 640px` and `min-width: 1024px`. Bottom tab bar below 1024 px only.
- Touch targets 44 px minimum; no horizontal scroll at 360 px; safe-area padding on fixed bars.
- Motion: transform/opacity only, 150–250 ms, disabled under `prefers-reduced-motion`.
- The cart is called "Cart" everywhere. Copy is plain sentence case; no all-caps labels, no invented facts, no arrows appended to button text.
- Every API path and payload stays byte-for-byte compatible with the current storefront.
- `localStorage` keys `vikipat.quote-list.v2` and `vikipat.print-jobs.v2` stay.
- Production builds never render the word "Photo" for a missing photo; dev builds do.

## Review Focus

1. The catalogue API is down or slow on mobile data: home tiles, shop and product must show skeletons, then an error with "Try again" and WhatsApp, never a blank screen. (Task 12, mock API `?fail=1` mode screenshots.)
2. Long names, big prices (GH₵12,450.00) and quantity 999 must not overflow cards or sticky bars at 360 px. (Task 12, mock catalogue includes a long-name, high-price product.)
3. The Android back button inside the print flow goes back one step; opening `/print?step=artwork` cold (no size chosen) falls back to the size step. (Task 1 `resolveStep` tests; Task 6.)
4. Custom sizes that are empty, 0, negative or above 10000 never show `NaN` and block Continue. (Task 1 `parseDimension` tests; Task 6.)
5. A cart holding a product that no longer exists in the catalogue, or a job whose price changed, still renders and checks out through the existing refresh path. (Task 8 uses `items` which already drops unknown products; Task 12 mock returns "estimate has changed" once.)

---

### Task 1: Pure logic modules and test runner

**Files:**
- Create: `apps/storefront/src/lib/progress.ts`, `apps/storefront/src/lib/priceHints.ts`, `apps/storefront/src/lib/printSteps.ts`
- Create: `apps/storefront/test/logic.test.ts`
- Modify: `apps/storefront/package.json` (add `"test": "node --experimental-strip-types --test test/"`)

**Interfaces (produced):**
- `type Stage = 'paid' | 'artwork' | 'printing' | 'ready'`
- `progressFor(publicStatus: string): { lit: number; current: number | null; halted: 'on_hold' | 'cancelled' | null }` — `lit` = dots fully done (0–4), `current` = index in progress or null.
- `STAGES: { key: Stage; label: string; color: string }[]`
- `minRateFor(materials: PrintMaterial[], outcomeSlug: string): number | null` (pesewas per sq ft)
- `minPriceIn(products: { department: string; price: number }[], departments: string[]): number | null` (cedis)
- `parseDimension(raw: string): number | null` — null when empty, not finite, ≤ 0 or > 10000.
- `type PrintStep = 'job' | 'size' | 'artwork'`; `resolveStep(param: string | null, hasJob: boolean, sizeConfirmed: boolean): PrintStep`

- [ ] **Step 1: Write the failing tests**

```ts
// apps/storefront/test/logic.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { progressFor } from '../src/lib/progress.ts';
import { minRateFor, minPriceIn } from '../src/lib/priceHints.ts';
import { parseDimension, resolveStep } from '../src/lib/printSteps.ts';

test('progress: awaiting payment lights nothing and marks paid as current', () => {
  assert.deepEqual(progressFor('Awaiting payment'), { lit: 0, current: 0, halted: null });
  assert.deepEqual(progressFor('Under review'), { lit: 0, current: 0, halted: null });
});
test('progress: statuses map onto the four dots', () => {
  assert.deepEqual(progressFor('Payment received'), { lit: 1, current: 1, halted: null });
  assert.deepEqual(progressFor('Awaiting your approval'), { lit: 1, current: 1, halted: null });
  assert.deepEqual(progressFor('In production'), { lit: 2, current: 2, halted: null });
  assert.deepEqual(progressFor('Out for delivery'), { lit: 3, current: 3, halted: null });
  assert.deepEqual(progressFor('Completed'), { lit: 4, current: null, halted: null });
});
test('progress: halted and unknown statuses', () => {
  assert.equal(progressFor('On hold').halted, 'on_hold');
  assert.equal(progressFor('Cancelled').halted, 'cancelled');
  assert.deepEqual(progressFor('Something new'), { lit: 0, current: null, halted: null });
});
test('price hints', () => {
  const mats = [
    { outcomes: ['shop-signage'], ratePesewasPerSqFt: 730 },
    { outcomes: ['shop-signage', 'events-backdrops'], ratePesewasPerSqFt: 260 },
  ] as never[];
  assert.equal(minRateFor(mats, 'shop-signage'), 260);
  assert.equal(minRateFor(mats, 'vehicle-glass'), null);
  const products = [{ department: 'DTF', price: 85 }, { department: 'DTF', price: 60 }, { department: 'Souvenirs', price: 55 }];
  assert.equal(minPriceIn(products, ['DTF']), 60);
  assert.equal(minPriceIn(products, ['Packaging']), null);
});
test('parseDimension rejects junk', () => {
  assert.equal(parseDimension(''), null);
  assert.equal(parseDimension('0'), null);
  assert.equal(parseDimension('-2'), null);
  assert.equal(parseDimension('abc'), null);
  assert.equal(parseDimension('10001'), null);
  assert.equal(parseDimension('2.5'), 2.5);
});
test('resolveStep never lands on a step whose inputs are missing', () => {
  assert.equal(resolveStep(null, false, false), 'job');
  assert.equal(resolveStep('artwork', false, false), 'job');
  assert.equal(resolveStep('artwork', true, false), 'size');
  assert.equal(resolveStep('artwork', true, true), 'artwork');
  assert.equal(resolveStep('size', true, false), 'size');
  assert.equal(resolveStep(null, true, false), 'size');
  assert.equal(resolveStep('job', true, true), 'job');
});
```

- [ ] **Step 2: Run to verify failure** — `cd apps/storefront && npm test` → fails, modules missing.
- [ ] **Step 3: Implement the three modules** (type-only imports so Node can strip them). `progressFor` uses this table: Under review, Awaiting payment → `{0,0}`; Payment received, Artwork review, Awaiting your approval → `{1,1}`; Ready for production, In production, Quality check → `{2,2}`; Ready for pickup, Out for delivery → `{3,3}`; Completed → `{4,null}`; On hold / Cancelled → halted; anything else `{0,null}`.
- [ ] **Step 4: Run** `npm test` → all pass.

### Task 2: Visual foundation, photos and content config

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/components.css`, `src/styles/shell.css`, `src/styles/pages.css`; rewrite `src/styles/index.css` to import only these.
- Create: `src/assets/work/{signs,shirts,stickers,mugs,caps,dtf,embroidery,press,printer}.webp` (crops of `vikipat-banner.jpeg`, no identifiable people), `src/assets/brand/logo-navy.png`, `logo-white.png`.
- Create: `src/content/photos.ts`, `src/content/services.ts`.
- Modify: `index.html` (Archivo font link with `wdth,wght@62..100,400..800`, `theme-color #FFFFFF`, description copy).

**Interfaces (produced):**
- `type PhotoKey = 'signs'|'shirts'|'stickers'|'mugs'|'caps'|'dtf'|'embroidery'|'press'|'printer'|'events'|'vehicle'|'indoor'|'packaging'|'labels'|'corporate'`
- `photos: Record<PhotoKey, { src?: string; alt: string; needed: string }>`
- `departmentPhoto: Record<string, PhotoKey>` keyed by API category (`Labels, Packaging, DTF, Large Format, Corporate Branding, Souvenirs, Events`).
- `services: Service[]` where `Service = { id: string; label: string; photo: PhotoKey; kind: 'print'; outcome: string } | { id: string; label: string; photo: PhotoKey; kind: 'shop'; departments: string[] }`
- CSS classes: `.btn .btn-primary .btn-secondary .btn-whatsapp .btn-block .btn-lg`, `.chip`, `.field .field-label .field-hint .field-error .input .textarea .select`, `.card`, `.skeleton`, `.visually-hidden`, `.shell-container`.

- [ ] Build tokens exactly from Global Constraints; component classes follow the System artboard.
- [ ] `npm run build` compiles (old pages still import old CSS files until Task 11 deletes them, so keep old files until then).

### Task 3: App shell, overlays, toast, loader

**Files:**
- Create: `src/components/AppShell.tsx` (exports `AppShell`, `Brand`), `src/components/TabBar.tsx`, `src/components/SiteHeader.tsx`, `src/components/SiteFooter.tsx`, `src/components/SearchSheet.tsx`, `src/components/Sheet.tsx`, `src/components/Toast.tsx` (exports `ToastProvider`, `useToast`), `src/components/Dots.tsx` (exports `Loader`, `OrderProgress`), `src/components/Photo.tsx`.
- Modify: `src/App.tsx` (lazy routes, `/cart`, `/list` → `<Navigate to="/cart" replace />`), `src/main.tsx` (wrap `ToastProvider`, drop `reveal-ready`).

**Interfaces (produced):**
- `<AppShell title?: string; back?: string | true; tabs?: boolean; bar?: ReactNode; children>` — `back` renders a back button (history back when `true`, link when string); `tabs=false` hides the tab bar; `bar` renders a sticky bottom bar instead of tabs.
- `<Sheet title: string; onClose(): void; children; footer?: ReactNode>`
- `useToast(): { show(message: string, action?: { label: string; to: string }): void }`
- `<OrderProgress status: string />`, `<Loader label?: string />`
- `<Photo name: PhotoKey; className?: string; sizes?: string />`

- [ ] Tab bar: Home, Print, Shop, Track, Cart with count badge (`useOrder().count`), `aria-current` on the active tab, hidden at ≥1024 px.
- [ ] Search sheet: full screen on phones, suggestions from `matches()`, Enter goes to `/shop?q=`.
- [ ] Verify: `npm run build`.

### Task 4: Commerce building blocks

**Files:** Create `src/components/Price.tsx` (`Price`, `formatCedis(value: number): string` → `GH₵85.00`), rewrite `src/components/Primitives.tsx` → `Stepper` only, rewrite `ProductCard.tsx` (add button or in-cart pill, toast on add), rewrite `ProductGrid.tsx` (`ProductGrid`, `NoResults`, `StatusPanel`).

**Interfaces:** `formatCedis`, `<Price value large? unit?>`, `<Stepper value onStep min max label size?>`, `<StatusPanel kind: 'error'|'empty'; title; note; actions?>`.

- [ ] Card layout per Shop artboard; sold-out card shows a disabled "Sold out" label, not an add button.

### Task 5: Home

**Files:** Rewrite `src/pages/Home.tsx`; styles in `pages.css` under `.home-*`.
- [ ] Hero + six service tiles with price hints from Task 1, then shortcuts, How ordering works, workshop photo strip (scroll-snap), featured products, visit panel. Match artboards Home and Home, further down; desktop per Home on desktop.

### Task 6: Print flow

**Files:** Rewrite `src/pages/PrintServices.tsx`; replace `src/components/PrintConfigurator.tsx` with `src/components/print/{PrintFlow,JobStep,SizeStep,ArtworkStep,PriceBar,SizePreview,MaterialSheet}.tsx`; delete `src/styles/configurator.css`.
- [ ] Step lives in `?step=` and is pushed with `navigate({ search }, { replace: false })`; `resolveStep` guards cold loads.
- [ ] Custom width/height use `parseDimension`; invalid → inline error, Continue disabled, price shows last valid value.
- [ ] Artwork step: radio cards (upload, link, design for me, later); "design for me" sets `needsDesign`. Add to cart → `addCustomJob` → navigate `/cart` with toast.

### Task 7: Shop and Product

**Files:** Rewrite `src/pages/Shop.tsx` (serves `/shop`, `/department/:slug`, `/search`), make `Department.tsx` and `Search.tsx` thin wrappers, rewrite `ProductPage.tsx`.
- [ ] Shop: search input, chips, count, Sort sheet (sort radios + in-stock switch), grid. Product: per Product artboard, sticky bar with live total.

### Task 8: Cart

**Files:** Create `src/pages/Cart.tsx`; delete `src/pages/OrderList.tsx`, `src/components/OrderDrawer.tsx`.
- [ ] Jobs and products, remove with undo toast, summary, sticky Checkout bar, WhatsApp alternative with optional note, empty state.

### Task 9: Checkout

**Files:** Rewrite `src/pages/Checkout.tsx`; delete `src/styles/checkout.css` after Task 10.
- [ ] Keep `handleSubmitOrder` request body and the price-refresh branch unchanged. Add on-blur validation for name, phone (`/^[+0-9 ()-]{8,24}$/`), email, delivery address; focus first invalid on submit. Button label: `Pay GH₵…` or `Send order for review` when any job `requiresReview`.

### Task 10: Confirmation and Track

**Files:** Rewrite `src/pages/OrderConfirmation.tsx`, `src/pages/TrackOrder.tsx`; delete `src/styles/track-order.css`.
- [ ] Confirmation: copy button with toast, payment status, `OrderProgress`, link `/track-order?order=…&email=…`.
- [ ] Track: same three API steps; prefill from query; result with `OrderProgress status={order.status}`, items, facts, timeline.

### Task 11: Help, About, Contact, Not found, copy and cleanup

**Files:** Rewrite `Faq.tsx`, `About.tsx`, `Contact.tsx`, `NotFound.tsx`; rewrite FAQ copy in `data.ts`; update `site.ts` nav; update `catalog.tsx` departments to use `departmentPhoto`; delete `components/Layout.tsx`, `lib/useReveal.ts` (move `useTitle` to `lib/useTitle.ts`), old CSS files (`base.css` old content, `controls.css`, `chrome.css`, `product.css`, `pages.css` old content, `vikipat.css`).
- [ ] `grep -rn "Unsplash\|East Legon\|Ogbojo\|quote list\|Order List" src` returns nothing customer-facing.
- [ ] `npm run build` passes with no unused imports.

### Task 12: Verification with a mock API

**Files:** Scratchpad only: `mock-api.mjs` (serves seed catalogue incl. one long-name GH₵12,450 product, materials, estimates, orders, OTP tracking, Paystack verify; `?fail=1` makes `/catalog` 503; first `/orders` call returns "estimate has changed"), `shoot.mjs` (Playwright screenshots at 360×780, 390×844, 768×1024, 1440×900 for every route and key state).
- [ ] Run, review every screenshot, fix defects, re-shoot until clean.
- [ ] Walk: home tile → print → size → artwork → cart → checkout; shop → product → cart; track with code; back button through print steps.
