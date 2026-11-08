# Roll-material reconciliation and owner analytics — design

## Intent and why

The internal-controls work (`2026-10-31-internal-controls-system`) built a reconciliation *report*: two independent numbers — billed area and logged consumption — for the owner to eyeball and judge, because at the time nothing tied either number to what was physically in the shop, and no real material data existed to build on.

The owner has now supplied that real data (large-format roll widths and lengths, DTF film specs, digital-printing sheet counts — see the chat message this spec follows) and the missing anchor: **someone physically checks what's left on a roll at the end of a day, week, or month, and that count is the ground truth.** This spec turns the report into a real check: the system computes what *should* be left, a person periodically says what *is* left, and a gap beyond a tolerance gets flagged — never auto-labelled theft, always surfaced for the owner to judge, same as every other control already built.

It also builds the "smart overview" the owner asked for — daily/weekly/monthly/yearly/all-time summaries of revenue, material use, material remaining, and every existing flag in one place.

## Goals

- Large-format and DTF jobs automatically compute the roll-length they consume from the job's own already-known dimensions — no one re-types a number that's already on the job.
- A roll (one specific width of one material) is tracked as one pool, in length, the way the owner described it: "one big material."
- Digital-printing consumables (bond, art paper, card) are tracked by sheet count, not length — they have no legitimate "waste" the way a cut roll does, so they get a tighter standard.
- A physical count, entered by staff at day/week/month end, is compared against the computed expected remaining amount; a gap beyond a configurable tolerance becomes a review flag, using the existing Controls/Flags pattern — not an automatic verdict.
- The tolerance is per material, not one global number, and starts loose until the shop has a real baseline (see "Tolerance" below).
- One dashboard, with a period selector (day/week/month/year/all-time), showing revenue, orders, material used, material remaining, and every open flag — building on the `AnalyticsService` and Controls work that already exist rather than replacing them.

## Non-goals

- Changing how jobs are priced. Pricing stays exactly as it is (area × rate); this is about what gets consumed from inventory, a separate question from what gets charged.
- A full purchasing/procurement module (ordering new rolls from a supplier, reorder points triggering purchase orders). Restocking a roll is just a stock increase, as it is today — not in scope here.
- Multi-roll-in-use-at-once tracking (e.g. two physical 5ft Flexy rolls open simultaneously, each with its own remaining length). One pool per (material, width) is enough for now; if the shop starts keeping multiple open rolls of the same width, that's a real but separate expansion.
- Hardcoding specific new print materials (PP, DTF, or any other) into the codebase. The admin creates these themselves, with whatever rates they choose, through the new capability below — this spec builds that capability, not specific catalog entries.

## Anti-goals (would make this a failure even if it technically works)

- A single global accuracy number that quietly reclassifies a bad week of trim waste as "theft" in the owner's eyes. The system must never say the word "theft" — it reports a percentage and a gap, the owner draws the conclusion.
- Forcing staff to keep manually logging consumption for roll materials once it's computed automatically — that defeats the point and reintroduces the "forgot to log it" false positive the auto-computation exists to remove.
- A tolerance so tight on day one that normal trim waste trips a flag constantly and the owner starts ignoring flags altogether.

## Constraints

- Builds on `apps/api/src/entities.ts`'s `MaterialItem`, `MaterialStockActivity`, `MaterialConsumption`, and `MaterialService` from the internal-controls-system branch (not yet merged to `main`). **This work branches from `internal-controls-system`, not from `main`** — my call, since the prerequisite tables don't exist on `main` yet. Whoever merges first, the other branch rebases.
- Same stack, same idioms: NestJS + TypeORM, Postgres migrations (SQLite dev via `synchronize: true`, no migration needed there), React admin app, `node --test` with the stub-repository style already used throughout.
- Money and existing area math stay in the units already used (pesewas, sq ft). New length tracking is introduced in **metres**, since that's the unit the owner gave roll lengths in (50m, 30m, 100m) and the unit a tape measure or roll-length counter would read in practice.

## The real material list, and how it maps

Every ambiguity in the first draft of this section came back to one answer from the owner: **don't guess the catalog — let the admin create materials and services themselves.** So this section is no longer a seed plan; it's reference data for the admin to use while setting up their own catalog through the new admin capability described below. Nothing here gets hardcoded into a migration or a seed script.

The owner's list sorts into three tracking models:

**1. Roll goods — large format (consumed by length, not area)**
SAV/Sticker, Flexy/Banner, Oneway Vision, TSAV, Blueback, PVC, Flag, PP each come in fixed roll widths and a fixed roll length. A job doesn't consume "area" from these — the roll's width is fixed once loaded; a job consumes *length*. The owner's exact tiers, for reference when setting these up (note some nominal sizes carry a few extra inches of real width — e.g. "10ft" Flexy is actually 126", not 120"):

| Material | Roll width tiers (nominal → actual) | Roll length |
|---|---|---|
| SAV/Sticker | 5ft→60in, 4ft→50in, 3ft→42in | 50m |
| Flexy/Banner | 10ft→126in, 8ft→102in, 7ft→90in, 6ft→73in, 5ft→63in, 4ft→51in, 3ft→39.5in, 2ft→25in | 50m |
| Oneway Vision | 5ft→60in, 4ft→50in, 3ft→42in | 50m |
| TSAV | 5ft→60in, 4ft→50in, 3ft→42in | 50m |
| Blueback | 5ft→60in, 4ft→50in, 3ft→42in | 50m |
| PVC | 5ft→60in, 4ft→50in, 3ft→42in | 30m |
| Flag | 5ft→60in, 4ft→50in, 3ft→42in | **two separate stocked roll lengths, 50m and 100m — the manufacturer supplies both as distinct products, not one roll that varies.** Each width × each length is its own material (e.g. "Flag 5ft/50m" and "Flag 5ft/100m" are two different rolls, tracked separately). |
| PP (Polypropylene Paper) | 5ft→60in, 4ft→50in, 3ft→42in | 50m |

PVC and PP don't need to be matched to an existing service code (`ash-back-pvc`, `white-back`, or neither) — the admin creates whichever ones are real, under whatever name fits, using the new capability below. Same for DTF.

**2. Roll goods — DTF film (same length-tracking model, fixed print sizes)**
DTF isn't freeform width×height — it's charged in standard sizes (A4/A3/A2/A1), same pattern `photopaper` already uses (`allowCustomSize: false` + `fixedSizes`, see `material-sizes.ts`'s `PHOTOPAPER_SIZES`). Two roll widths: a 60cm roll (for A2 and larger) and a 30cm roll (for A3 and smaller). Rate per size: **configurable** — the admin sets it when creating the service, same as every other rate in Pricing Studio.

**3. Sheet-fed — digital printing (consumed by count, not length, sold per sheet)**
A4/A3 bond, art paper, card. Sold **per sheet** — which means these don't need the roll/`MaterialItem` machinery at all. A "per sheet" item is exactly what `Product` already is: a priced, stocked, sellable unit (`unit: '1 sheet'`, `stock` = sheets remaining). The admin already can create new `Product` entries today (Catalogue → Add product) — no new code needed for *that* part. What's new is giving `Product` the same tolerance/physical-count protection `MaterialItem` gets, covered below, since a ream of bond paper deserves the same check as a roll of vinyl.

## How the mechanism works

### Admin creates services and materials themselves — the piece every answer pointed at

Today, adding a new print material means an engineer edits `pricing-material-seed.ts` and redeploys. That's no longer acceptable for this shop's real workflow — PP, DTF, and any future material need to exist without code changes. New admin capability:

- **Create a print service** (new `ServicePriceRule`): name, a code (auto-slugged from the name, editable, checked for uniqueness), the four rates (employee/marketer/walk-in/online), design minimum, rounding mode — the same fields Pricing Studio already *edits*, now also *creatable*. It's created already published at version 1 (no draft cycle needed — there's no existing public rate a draft would be protecting, unlike editing a live rule). Whether it allows custom sizes or uses fixed sizes (for DTF) reuses the "Customer sizes" panel Pricing Studio already has for existing rules — nothing new needed there once the rule exists.
- **Create a material** (`MaterialItem`): the admin form from Task 5 gains roll fields — `kind: 'roll' | 'count'`, and for `'roll'`: the service code it feeds and its width (admin enters a value + unit — ft, in, or cm — converted to metres for storage) and starting length in metres. A `'count'` `MaterialItem` (no roll fields) stays for raw consumables that aren't themselves a sold unit — ink, lamination film — tracked by the generic unit Task 5 already supports.
- **Create a product** already exists (Catalogue → Add product) — used as-is for "per sheet" digital-printing paper, per the mapping above.

### Roll materials: tracked by length, consumption computed automatically

`MaterialItem` gains an optional roll shape, used only when a material represents one specific width of roll stock:

- `kind: 'roll' | 'count'` (new column, defaults `'count'` for every material created before this ships, so nothing existing breaks).
- `rollWidthMetres: number | null` — the physical width of this specific roll.
- `serviceCode: string | null` — which `ServicePriceRule` this roll serves. (One service code can have several `MaterialItem` rows, one per width tier — e.g. five rows for Flexy/Banner's five widths.)

`stockQuantity` for a roll item is in **metres of length remaining**, not the generic unit string used for `'count'` materials.

**When this runs:** at the production job's transition *into* `in_production` (not at order release/intake). This is a deliberate correctness call, settled during the builder-check pass on this document: jobs that get cancelled or blocked are overwhelmingly stopped during artwork review or proofing, before anything is actually cut — computing consumption at release would count material for jobs that never physically touch a roll, corrupting every later physical count's `expectedQuantity`. Triggering at the moment cutting genuinely starts avoids that for the common case. The rarer case — a job spoiled or cancelled *after* entering production — is not auto-reversed; by then material is usually genuinely gone (a bad cut still used roll length) or a reprint is needed (using *more*, not less). Staff can log a correction via the existing manual "Log material used" control (including a negative/credit entry) if a specific case genuinely needs one. This trades a small, rare, staff-correctable gap for not having to build an automatic reversal system now.

1. Convert the job's `width`/`height` (already on `ProductionJob.specification`, same JSON the pricing engine already wrote) to feet, same conversion the pricing engine already does.
2. Take the **smaller** of the two as the across-the-roll dimension. *(My call: a job can usually be rotated 90° to fit the roll, so the narrower side is what decides which roll width it needs, regardless of which the customer called "width." Flag if this isn't how printing is actually done — some finishes can't be rotated.)*
3. Among the `MaterialItem` rows for this job's `serviceCode`, pick the smallest `rollWidthMetres` that is ≥ that dimension **and has enough `stockQuantity` left for this job's draw** — staff would reach for the next size up if the right-sized roll has run out, so the automatic version does the same. If no tier, of any width, has enough left, don't guess — leave the job's consumption unlogged and flag it ("no matching roll with enough stock — log material manually") rather than drawing a roll negative.
4. `lengthMetres = totalAreaSqFt / rollWidthFt × 0.3048` (convert the resulting feet to metres). This uses the job's `totalAreaSqFt`, which already includes quantity, so one computation covers the whole line item — not one job, not one piece.
5. Record this exactly like the existing `MaterialConsumption` row (Task 6), just written by the system instead of typed by staff. The manual "Log material used" control stays, for corrections (a reprint, a spoiled piece) — it's no longer the normal path for roll materials, only the exception path.

`'count'`-kind materials (raw consumables that aren't themselves a sold product — ink, lamination film) keep working exactly as Task 6 built them: logged manually, one row per use.

### Physical counts, anchored to reality — covers both `MaterialItem` rolls and `Product` sheets

New entity, `MaterialPhysicalCount`: `id, targetKind ('material_item' | 'product'), targetId, measuredQuantity, expectedQuantity, accountedForPercent, recordedBy, recordedAt, note`. One mechanism, two possible targets — a roll (`MaterialItem`) or a sheet-sold product (`Product`) — since digital-printing paper's "stock remaining" and "stock sold" are the same number and don't need a second tracking table. `expectedQuantity` and `accountedForPercent` are computed once, at the moment the count is recorded, and stored as plain columns — not recomputed on every read. *(Settled during the builder-check pass: if a material's tolerance is edited later, or a backdated correction is logged, a live-recomputed view would silently change what a past flag says, which breaks trust in the log the same way an editable `AuditLog` would. This matches how `OrderStatusHistory` and `AuditLog` already work in this codebase — a historical record states what was true when it was written, full stop.)*

Both `MaterialItem` and `Product` gain a `tolerancePercent` column. A new admin action, "Record physical count," appears on each roll and each stocked product.

When a count is recorded:

- Find the target's previous count (or, if there isn't one yet, its current `stockQuantity`/`stock` as the starting baseline).
- Sum every consumption and restock since that previous point — `MaterialConsumption` + `MaterialStockActivity` for a `MaterialItem`; order-placed decrements + `StockActivity` for a `Product`.
- `expectedQuantity = previousQuantity − consumedSinceThen + restockedSinceThen`.
- `accountedForPercent = measuredQuantity / expectedQuantity × 100` (guarded: if `expectedQuantity` is 0 or negative, that's a data problem worth its own flag, not a percentage).
- If `accountedForPercent` is below the tolerance, write a new flag — reusing the Controls "Flags" tab pattern already built (Task 7), a fourth category alongside custom-priced items, late cancellations, and unattended jobs. The flag's own text states the percentage plainly: *"Flexy/Banner 5ft: 86% accounted for (42.3m expected, 36.4m counted) — recorded by Kofi, 2026-11-07."* Never the word theft.
- The count itself also becomes the new `stockQuantity`/`stock`, becoming the next count's baseline — so a confirmed gap doesn't keep re-flagging every day; it's accepted once reviewed (the owner can also leave the system's number as-is if they decide the gap was wastage, not loss, since the number after a count is just set to what was actually measured).

### Tolerance — approved, both defaults confirmed

Per material/product, not global, stored as `tolerancePercent` on `MaterialItem` and `Product`:

- Roll materials (large format, DTF): **90%** to start.
- Sheet-sold products (digital-printing paper): **98%** to start.

Both editable per item in the admin UI (the same place stock is adjusted), immediately, no restriction on what the owner sets them to.

### The owner dashboard

One view (likely its own tab in `Controls`, or a redesigned `Overview` — left to the plan to decide the cleanest fit with what already exists) with a period selector: **Today, This week, This month, This year, All-time**, each showing:

- Revenue, orders, average order value — reusing `AnalyticsService`'s existing period logic rather than re-building it.
- Material used in the period (sum of `MaterialConsumption` by `MaterialItem`, plus units sold of each tracked `Product`) and what's currently remaining for each (latest known `stockQuantity`/`stock`, i.e. the last count or computed running balance, whichever is more recent).
- Every open review flag for the period: custom-priced items, late cancellations/refunds, unattended jobs (all three already built), and the new material/product-count-shortfall flag.

The existing daily owner-digest email (Task 9) stays daily-only in this spec — **my call**: a recurring email at every cadence (daily, weekly, monthly, yearly) risks becoming noise the owner stops reading; the in-app dashboard covers the other periods on demand. If the owner wants weekly/monthly emails too, that's a one-line addition to `OwnerDigestService` later, not a blocker here.

## What's left to the builder

- Exact new/changed files, migrations, test fixtures, and task breakdown — that's `superpowers:writing-plans`' job once this design is approved, same process as the internal-controls-system work.
- Where exactly the new dashboard view lives in the admin app's navigation (a new tab, a redesigned Overview, or something else) — a UI-fit decision for the plan, not a product decision that changes behaviour.
- The exact wording and layout of the material-count-shortfall flag and the "Record physical count" form.

## Owner questions — all answered

1. ~~PVC mapping~~ — resolved: admin creates materials/services themselves, no pre-mapping needed.
2. ~~What is PP~~ — Polypropylene Paper, confirmed.
3. ~~DTF pricing~~ — configurable; admin sets it when creating the service.
4. ~~Digital paper ordering unit~~ — per sheet; modeled as a `Product`.
5. ~~Tolerance starting points~~ — approved as proposed (90% roll, 98% sheet).
6. ~~SAV roll length~~ — 50 metres, folded into the reference table above.
7. ~~Flag's 50m vs 100m~~ — two genuinely separate stocked roll lengths, each its own material.

Nothing outstanding. The design is ready to plan.
