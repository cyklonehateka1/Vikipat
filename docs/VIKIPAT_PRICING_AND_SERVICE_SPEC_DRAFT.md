# Vikipat — Draft Service Catalogue & Pricing Specification
**Status: DRAFT for owner/operations/finance review — every figure not sourced from the Large Format Price List is a placeholder assumption and MUST be corrected before it drives real pricing.**
Version 0.1 · Drafted from: `LARGE FORMAT PRICE LIST.docx` (real data), the two blank discovery workbooks (question structure), and the existing codebase (`docs/VIKIPAT_PLATFORM_BUILD_BLUEPRINT.md`, `packages/pricing-engine`, `apps/api/src/entities.ts`).

> **How to use this document:** Every section either (a) restates confirmed real data, tagged `[CONFIRMED]`, or (b) proposes a value/rule for the owner to accept, edit, or reject, tagged `[DRAFT — CONFIRM]`. Nothing tagged DRAFT should be treated as live pricing until someone signs off in Section 10.

---

## 1. Confirmed data: Large Format Pricing

`[CONFIRMED — source: LARGE FORMAT PRICE LIST.docx]`

| Material | Employees (GH₵/ft²) | Marketers (GH₵/ft²) | Walk-in (GH₵/ft²) |
|---|---|---|---|
| SAV / Sticker | 2.10 | 2.20 | 2.40 |
| Flexy / Banner | 2.30 | 2.40 | 2.60 |
| One-way vision | 5.90 | 6.05 | 6.30 |
| Transparent SAV | 3.80 | 3.90 | 4.10 |
| Reflective SAV | 6.00 | 6.15 | 6.50 |
| Blueback | 3.80 | 3.90 | 4.10 |
| Ash-back / PVC | 7.00 | 7.15 | 7.30 |
| White-back | 2.20 | 2.35 | 2.60 |
| Flag | 5.40 | 5.50 | 5.80 |
| Cutting (SAV) | 4.10 | 4.20 | 4.40 |
| Cutting (TSAV) | 5.80 | 5.90 | 6.10 |
| Cutting only | 1.50 | 1.60 | 1.80 |
| Photopaper | 5.90 | 6.05 | 6.10 |

**Formula (feet):** `size × size × rate-per-ft² × quantity`
Example: banner 3ft × 3ft × GH₵2.60 × 1 = GH₵23.40 *(the source example says 23.00 — confirm whether rounding-down is intentional)*.

**Formula (inches):** `(size × size) / 144 × rate-per-ft² × quantity`
Example: sticker 3.5in × 2in / 144 × GH₵2.40 × 100 = GH₵11.67 *(source example says 12.00 — same rounding question)*.

`[DRAFT — CONFIRM]` Open questions this raises for the owner:
1. The two worked examples round differently than a literal calculation. Please confirm the **exact** rounding rule (nearest cedi? nearest 0.05? always round up?) — this is the single most important number for the whole pricing engine's trustworthiness.
2. "Employees / Marketers / Walk-in" are three customer-tier price books. For the storefront, is the default the **Walk-in** rate (since it's the only tier without a human relationship), with Employee/Marketer rates only ever applied manually by staff on internal orders? This is what the current codebase already assumes (`ServicePriceRule` supports multiple price books) — please confirm or correct.
3. Is there a **minimum job charge** for large format (e.g. no job below GH₵X regardless of size)? Not in the price list — assumed **GH₵20 minimum** as placeholder.
4. Is there a **quantity discount** for large runs (e.g. 50+ ft²)? None given — assumed **none** until confirmed.
5. Design/artwork-correction fee, rush surcharge, and delivery are not in this list — see Sections 5–6 for draft defaults.

---

## 2. Draft Service Catalogue (instant price vs. staff-confirmed)

Built from the checklist items in both workbooks, deduplicated into one launch catalogue with a `[DRAFT — CONFIRM]` pricing-mode recommendation per line. **"Instant" = system may accept payment with no human look at the job first. "Staff-confirmed" = system estimates, but an operator must approve before payment is finalised.**

### Large format
| Service | Mode (draft) | Basis |
|---|---|---|
| Banners / flexy | Instant | Area × rate (confirmed data above) |
| Stickers/SAV, one-way vision, transparent/reflective SAV, blueback, ash-back, white-back, photopaper | Instant | Area × rate |
| Flags | Instant | Area × rate |
| Cutting-only jobs | Instant | Area × rate |
| Pull-up banners (stand + print) | Instant if stock stand size; staff-confirmed if custom | Fixed stand cost + print area |
| Backdrops / photo walls | Staff-confirmed | Bespoke structure, install |
| Vehicle branding / wraps | Staff-confirmed | Vehicle inspection required |
| Signage / boards / 3D signs / light boxes / acrylic / metal | Staff-confirmed | Fabrication, materials vary |
| Window/wall/floor graphics | Instant for flat-material only; staff-confirmed if install included | Area × rate + install |
| Installation (standalone) | Staff-confirmed | Site-dependent |

### Small format
| Service | Mode (draft) | Basis |
|---|---|---|
| Business cards, flyers, letterheads, envelopes, invitation cards, receipt/invoice books | Instant | Quantity-tier price table (sheet imposition) |
| Brochures, books/programmes/manuals, calendars | Staff-confirmed for low volume/complex binding; instant once a standard tier table exists | Sheet imposition + finishing |
| Certificates, funeral programmes, menus | Instant | Quantity-tier table |
| Stickers/labels (small format, sheet-cut, non-large-format) | Instant | Sheet imposition |

### Apparel & textiles
| Service | Mode (draft) | Basis |
|---|---|---|
| DTF transfers only (print film, customer applies) | Instant | Gang-sheet area × rate |
| DTF printed apparel (Vikipat applies to garment) | Instant if standard blank garment; staff-confirmed if customer supplies garment | Garment cost + DTF + press labour |
| Screen printing | Staff-confirmed | Screen setup depends on colours/quantity |
| Embroidery | Staff-confirmed | Digitising fee varies per logo; stitch count only known after digitising |
| Sublimation | Staff-confirmed (mugs/apparel differ) | Material + press time |
| Caps, tote bags, uniforms/workwear | Instant for blank + standard decoration; staff-confirmed for bespoke | Unit price × quantity + decoration |

### Packaging & promotional items
| Service | Mode (draft) | Basis |
|---|---|---|
| Product/food/cosmetic/bottle labels | Instant | Sheet imposition or roll length |
| Paper/gift bags, boxes/cartons | Staff-confirmed (die-cut tooling varies) | Supplier cost + markup |
| Mugs, tumblers, bottles, pens, keyholders, lanyards | Instant | Unit × quantity |
| Awards/plaques | Staff-confirmed | Bespoke materials |
| Event/corporate packs | Staff-confirmed | Bundled, multi-item |

### Ready-made goods & supplies (shop, not configured services)
| Product | Mode | Basis |
|---|---|---|
| DTF film/powder, blank apparel, vinyl/banner material rolls, other consumables | Instant, standard e-commerce | Fixed SKU price, stock-tracked |
| Ready-branded shirts/items | Instant | Fixed SKU price, stock-tracked |

`[DRAFT — CONFIRM]` **Owner action needed:** tick which of the above are actually ready to sell online today vs. "planned" vs. "never online" — this table is my best guess from the workbook checklists, not a decision.

---

## 3. Draft Pricing Models (extends the existing `packages/pricing-engine`)

The codebase already supports a large-format area calculator and versioned pricing rules with draft/publish. To cover the rest of the catalogue, propose these calculation models (matching the "Choose the calculation model" section of the discovery workbook):

1. **Area-based** (large format) — ✅ confirmed data, built.
2. **Sheet imposition** (business cards, flyers, labels) — `ceil(quantity ÷ items-per-sheet) + spoilage-sheets`, then `sheets × sheet-cost + setup fee`. **Needs:** items-per-sheet by size, sheet cost by stock/GSM, spoilage rule (draft default: +1 sheet per 500, minimum 1).
3. **Unit × quantity with price breaks** (mugs, pens, caps, apparel) — flat table of `quantity range → unit price`, decreasing at breakpoints. **Needs:** actual breakpoints and unit costs per product.
4. **Stitch-count / digitising** (embroidery) — `digitising fee (one-time per logo) + (stitch-band price × quantity) + garment cost`. **Needs:** digitising fee, stitch-band price tiers (e.g. 0–5k, 5–10k, 10k+ stitches), garment cost list. Recommend **staff-confirmed only** at launch since stitch count isn't knowable from a logo file without digitising software.
5. **Colour/screen count** (screen printing) — `screen setup fee × number of colours + (per-unit ink charge × colours × quantity) + garment cost`. **Needs:** setup fee per screen, per-colour per-unit rate. Recommend **staff-confirmed** at launch.
6. **DTF gang-sheet** — `(printed area in ft² × DTF rate) + press labour per item + garment cost (if supplied by Vikipat)`. **Needs:** DTF rate per ft², press labour rate.
7. **Fixed price / SKU** (shop products) — standard e-commerce price + stock.
8. **Formula + review** (fallback) — system computes a best-effort estimate from the closest model above but always routes to staff review before payment; used for anything not yet in models 1–7.

`[DRAFT — CONFIRM]` Universal pricing inputs proposed (from workbook §5 "Universal pricing inputs" list), to be confirmed per service:
- Base/minimum job charge
- Setup/design fee
- Material cost
- Wastage % (draft default: 5% of material, rounded up to nearest whole sheet/unit)
- Rush surcharge (draft default: **+25%** of production subtotal, cutoff = same-day/next-day)
- Delivery/installation fee (see Section 6)
- VAT/tax (draft assumption: **prices are VAT-inclusive**, Ghana standard rates — **must be confirmed with the company's accountant**, especially given the 2025/2026 GHS VAT changes)
- Rounding rule (draft default: round to nearest GH₵0.10 — **conflicts with the two large-format examples above; must be resolved**)
- Target gross margin floor (unknown — needs finance input, not guessable)

---

## 4. Draft Order & Production Workflow

This matches what's already implemented in `apps/api` (Order/ProductionJob entities) — restated here so the owner can confirm the customer-facing language and gates, not the engineering.

**Customer-visible stages:** Order placed → Payment confirmed → Artwork/proof (if applicable) → In production → Quality check → Ready → Out for delivery / Ready for pickup → Completed.

**Payment gate (`[DRAFT — CONFIRM]`):**
- Instant-price services: full payment via Paystack before the order is accepted into the queue.
- Staff-confirmed services: customer submits specs + artwork → staff reviews and sets final price → customer pays the confirmed amount (payment link) → order proceeds.
- Deposit model for large/bespoke jobs (vehicle wraps, signage fabrication, bulk apparel): **draft default 50% deposit, balance due before dispatch/installation** — needs finance sign-off on percentage and which services it applies to.

**Walk-in orders (your explicit new requirement):**
The system already has an "admin creates order (walk-in/salesperson)" endpoint. Draft flow: staff opens a new order in the back-office dashboard → selects/enters services using the *same pricing engine* as the storefront (so walk-in and online prices stay consistent) → applies the Employee/Marketer/Walk-in tier as appropriate → records payment method (cash, Paystack terminal/link, mobile money, bank transfer) → order enters the same production queue as online orders, tagged with its origin (`storefront` / `walk-in` / `salesperson`) for reporting.

`[DRAFT — CONFIRM]` Does walk-in ever bypass payment (i.e. "pay on completion" credit customers)? Workbook §12 mentions "staff-approved pay-later corporate account" — needs a yes/no and, if yes, credit-limit rules from finance.

---

## 5. Draft Artwork & Proofing Rules

- Accepted formats: PDF, AI, CDR, EPS, PSD, PNG, JPG (draft — matches both workbooks' suggested list).
- Max upload size: draft **25MB per file, 100MB per order** (placeholder — confirm against actual server/storage limits and typical large-format file sizes, which can exceed this).
- Colour: warn customers uploading RGB that print output is CMYK and colour may shift; no hard block.
- Proof required for: staff-confirmed services and any first-time embroidery/screen-print logo (digitising accuracy). Not required for repeat/reorder jobs with unchanged artwork.
- Included revisions: draft **1 free revision**, additional revisions **GH₵0** for minor fixes / **staff-quoted** for redesign — needs real number from design team.
- Design/full-artwork-creation charge: **not in any confirmed document** — this is a gap; needs an actual rate card from the design team (e.g. per-hour or per-job).

---

## 6. Draft Delivery & Pickup

| Zone | Fee model (draft) | Confirm |
|---|---|---|
| Pickup (Mallam–Gbawe Road) | Free | — |
| Nearby (same suburb) | Flat GH₵20 | needs real rate |
| Accra-wide | Flat GH₵40, or distance-banded | needs real rate/policy |
| Outside Accra | Courier-quoted at checkout (staff-confirmed) | needs courier partner |
| Installation | Travel + labour, staff-confirmed only | needs rate card |

---

## 7. Draft Financial/Admin Oversight

Already partly built (payment list/summary endpoints). Confirm which of these the owner wants in the executive dashboard at launch vs. phase 2:
- Gross sales, net sales, collections, deposits outstanding — **must-launch**
- Revenue by service/channel (storefront vs walk-in vs salesperson) — **must-launch**, directly enables comparing the new online channel to existing walk-in
- Gross margin by service — **phase 2** unless cost data is ready now
- Paystack fees/settlement reconciliation — **must-launch** (required to trust the numbers)
- Inventory value, waste/rework cost, machine utilisation — **phase 2**

---

## 8. Edge Cases — Draft Default Rules

(Selected highest-impact rows from workbook §7/§22; full list needs owner sign-off but these unblock development now.)

| Scenario | Draft rule |
|---|---|
| Price changes while basket is unpaid | Recalculate at checkout; if higher, show new price before payment; hold nothing without payment. |
| Payment succeeds but webhook delayed | Poll Paystack verify-by-reference on a timer; do not duplicate-charge; show "confirming payment" to customer. |
| Customer pays twice | Auto-detect duplicate reference/amount within short window; flag for finance refund, do not double-fulfil. |
| Artwork doesn't match ordered size | Block auto-production; route to staff review with a specific "artwork mismatch" reason. |
| Customer doesn't respond to proof after N days | Draft: auto-reminder at 3 and 7 days, order auto-cancelled with refund-minus-work-done at 14 days — **needs real policy**. |
| Order not collected | Draft: hold 30 days, then storage fee or forfeiture — **needs real policy**. |

---

## 9. What still cannot be drafted — must come from Vikipat directly

No amount of reasonable guessing substitutes for these; they require the business owner/operations/finance team:

1. **Real price lists for every service beyond large format** (small format sheet costs, apparel/embroidery/screen-print/DTF rates, promo item unit costs, packaging costs).
2. **At least 5 real recent quoted jobs per major service** — needed to test the pricing engine actually matches how they quote today (this is explicitly called out in both workbooks as the single most valuable input).
3. **Machine/material size limits** (max printable width, garment size ranges, etc.).
4. **Confirmed rounding rule** — the two large-format worked examples don't match a literal calculation; this must be resolved before anything goes live.
5. **VAT/tax treatment** — confirm with their accountant.
6. **Deposit percentages and which services require them.**
7. **Paystack business account** (keys shared securely, never in documents).
8. **Staff list and roles** for back-office access.
9. **Photos of services/materials/finishes** for the storefront.
10. **Delivery zone rates**, if they have an existing informal rate card.

---

## 10. Sign-off

| Section | Confirmed by | Date | Notes |
|---|---|---|---|
| Large format pricing (rounding rule) | | | |
| Service catalogue (instant vs staff-confirmed) | | | |
| Non-large-format pricing models | | | |
| Deposit/payment rules | | | |
| VAT/tax treatment | | | |
| Delivery rates | | | |
| Artwork/proof policy | | | |
