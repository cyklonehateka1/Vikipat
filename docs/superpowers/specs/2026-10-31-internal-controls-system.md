# Internal controls / leakage-detection system — spec

Vikipat (print shop, Accra). The owner is often away from the shop. Staff have
legitimate access to machines, materials, and customers during their shift, so
network/printer lockdown (discussed and rejected earlier in this project)
cannot stop a job being done "off the books": work performed with company
time, machine and material, cash collected, nothing ever entered into
Vikipat. This spec covers the counter-measures agreed on: make every job
leave at least two independent, hard-to-fake records, so an unrecorded job
shows up as a mismatch somewhere rather than as nothing at all.

**This is a detection/deterrence system, not a prevention system.** Nothing
here claims to make leakage impossible — it makes it leave a trace that a
daily/weekly review surfaces quickly. Say so in any UI copy that describes it.

## Decisions carried into this build (no further sign-off needed)

1. **Payment-before-release becomes the default for every order source**,
   closing the gap in the current code where `walk_in`/`salesperson` orders
   skip the payment check entirely. A named, logged exception lets a
   supervisor release an unpaid order anyway (e.g. a trusted account on
   invoice terms) — it must never be silent.
2. **Machine "meter" reconciliation is staff-entered, not device-polled.**
   Prior research in this project found no supported API for the RIP
   software in use (Onyx/Caldera) or evidence of a vendor-neutral way to pull
   printer counters remotely. Modelling it as an automatic integration would
   be fiction. It is a manual log entry, same shape as a material log entry.
3. **No automatic "expected vs actual" variance score is invented** for
   material use. The report puts the two real numbers side by side — sq ft
   billed per service code vs. quantity logged per material, both for a
   chosen period — and a person judges the gap. Auto-computing a single
   "variance" number would require a material-to-service-code mapping this
   shop has never configured; building that mapping UI is out of scope here
   (YAGNI) in favour of shipping the two honest numbers now.
4. **"Manual price override" only applies to custom/manual-quote line
   items.** Catalogue products price from the catalogue; large-format items
   always price from the live pricing engine server-side — there is no
   client-settable override for either, confirmed by reading
   `OrderLineItemDto` and `OrderService.estimate`. The only place a human
   types in a price is `kind: 'custom'` order items. There is no "computed"
   price to compare against for those (they're bespoke), so the feature is:
   **surface every custom-priced item for owner review**, not "flag
   deviation from a baseline that doesn't exist."
5. **Attendance cross-checking is a report, never a block.** Attendance data
   is self-reported and can be legitimately incomplete (forgotten clock-in,
   corrected after the fact), so it must never stop a job moving — only
   surface for review.
6. **All new report/flag views are admin-only**, via the existing
   `user.role==='admin'` gate already used for every other owner-facing view
   in `apps/admin/src/main.tsx`. No new permission plumbing needed for
   visibility; `jobs.release_unpaid` (new) only gates the override action
   itself, for supervisors.

## New data

- **`material_items`** — the shop's tracked consumables (vinyl rolls, ink,
  paper, etc.) and, by convention, "meter/machine readings" as items whose
  `unit` is something like `'pages'` or `'sq ft (meter)'`. Same shape as
  `Product`/`StockActivity` deliberately, so the admin UI and service code
  mirror the existing Inventory feature exactly.
- **`material_stock_activity`** — mirrors `stock_activity`, for raw
  materials instead of finished goods.
- **`material_consumption`** — one row per (job, material) logging event:
  `jobId`, `materialItemId`, `materialName` (denormalised, same pattern as
  `ProductionJob.customerName`), `quantity`, `unit`, `recordedBy`,
  `createdAt`. Logging a row decrements the linked `MaterialItem.stockQuantity`
  and writes a `material_stock_activity` row in the same transaction.
- **`release_overrides`** — one row per payment-before-release exception:
  `orderId`, `orderNumber`, `reason`, `actorEmail`, `createdAt`. This is the
  audit trail for decision 1.

No changes to `orders`, `order_items`, `production_jobs` schema. All new
flag/report endpoints are read-only queries over existing tables
(`order_status_history`, `attendance_records`, `order_items`,
`order_refunds`) plus the two new tables above.

## Behaviour changes

### Release gate (`apps/api/src/production-release.ts`)
Current: `if (order.paymentStatus !== 'paid' && !['walk_in','salesperson'].includes(order.source)) throw BadRequestException(...)`.

New: payment is required for every source. `releaseProductionJobs(manager, orderId, actor, override?)` takes an optional fourth argument `{ reason: string }`. When the order is unpaid and `override` is given, release proceeds, a `release_overrides` row is written, and the existing `ProductionJobActivity` "system" note includes the reason. When unpaid and no override, the existing `BadRequestException('Online orders must be paid before production release')` message changes to `'Payment must be recorded before production release'` (it's no longer online-specific).

The `jobs.release_unpaid` permission (new entry in `@vikipat/domain`'s `PERMISSIONS`) gates who may supply an override. Both `admin` and `operations_supervisor` already receive the full `PERMISSIONS` array, so both get it automatically; no role-table change needed beyond adding the string to the array.

### Order creation (`apps/api/src/order.service.ts`, `createGuest`)
After the existing `queueEmail(order,'order_created',...)`, add `queueWhatsApp(order,'order_created',{ subject, text })` with the same payload shape used elsewhere (`subject`, `text`). `queueWhatsApp` already no-ops safely when there's no phone or WhatsApp is disabled — same call shape as its other three call sites.

## Report endpoints (all under `admin/orders`, all read-only, all `AdminOnlyGuard`)

- `GET admin/orders/flags/custom-priced?from&to` — order items with `kind='custom'`, joined to their order, in the date range.
- `GET admin/orders/flags/late-cancellations?from&to` — orders currently `cancelled`, or with an `order_refunds` row, where `order_status_history` shows the order reached `ready_for_production` or later *before* the cancellation/refund.
- `GET admin/orders/flags/unattended-jobs?date=YYYY-MM-DD` — `production_job_activity` rows of type `stage_change` on that date where no `attendance_records` row covers that timestamp for any active employee.
- `GET admin/materials` / `POST admin/materials` / `PATCH admin/materials/:id` / `POST admin/materials/:id/stock` — material items, same verb shape as the existing `admin/products` endpoints.
- `POST admin/orders/production/jobs/:id/consumption` — log a `material_consumption` row against a job (`materialItemId`, `quantity`, `unit`).
- `GET admin/materials/reconciliation?from&to` — per service code in range: sum of `totalAreaSqFt` from released large-format `production_jobs` specifications, next to sum of `material_consumption.quantity` in the same range grouped by `materialName`. Two lists, not a merged score (decision 3).

## Owner daily digest

New `OwnerDigestService`, `@Cron(CronExpression.EVERY_DAY_AT_7AM)` (Ghana has no DST and sits at UTC+0, so this is also 7am Accra time — confirmed, no timezone conversion needed anywhere in this feature). For the previous full day: orders created (count, value, by source), payments collected, counts from each of the three flag endpoints above that fired that day, and any `MaterialItem` at or below its `lowStockThreshold`. Emailed via the existing `MailService` to `process.env.ADMIN_EMAIL` (the same address the bootstrap admin account and password-reset emails already use — no new env var).

## Admin UI

One new view, `controls` (nav id), admin-only (falls under the existing `user.role==='admin'` filter in `Sidebar`'s `nav.filter`, no new logic there), with its own icon (`ShieldAlert` — `ShieldCheck` is already used by `staff`) and `viewMeta` entry. Internally tabbed, same tab pattern as `People.tsx` (`Team`/`Attendance`/`Payroll`/`Performance`):

- **Flags** tab: the three report endpoints above, each its own `data-table`.
- **Materials** tab: material item list + stock adjustment, mirroring the existing `Inventory`/`Products` admin UI exactly.
- **Reconciliation** tab: the two side-by-side lists from the reconciliation endpoint.

`OrdersWorkspace.tsx`'s counter/release flow gets the override control: when a release attempt fails because the order is unpaid, and the signed-in user has `jobs.release_unpaid`, show a reason field and a "Release anyway" action that resubmits with the override. Users without that permission just see the existing error.

The job detail panel in `Operations` (in `main.tsx`) gets a small "Log material used" control (material picker + quantity) that calls the new consumption endpoint — visible to anyone with `jobs.note` (same gate already used for the existing note box), since this is a routine production action, not a sensitive one.
