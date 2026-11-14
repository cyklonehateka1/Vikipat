# Offline-first staff app (Vikipat admin) — design

## Intent and why

The shop floor doesn't have reliable internet. Staff need to keep taking walk-in
orders, recording payments, moving jobs through production, and adjusting stock
regardless of connectivity, on any number of devices in the shop at once, and
every one of those actions has to land on the server exactly once, with no
silent data loss, once connectivity comes back.

## Goals

- The full walk-in-order-to-fulfilment flow (create order, record payment,
  release to production, move production stages, log material consumption,
  adjust stock, create/edit customers) works with zero network.
- Every offline action is durably written to disk (IndexedDB) before it's
  considered saved on that device — survives a tab close, browser crash, or
  machine restart.
- Multiple devices in the same shop can be offline at the same time, touching
  the same orders/jobs/stock, and sync afterward with zero duplicate side
  effects and zero silently-overwritten edits.
- Staff can see, per record, whether it's "saved on this device" or "synced,"
  so nothing feels lost while offline.
- The reference data needed to operate offline (products, pricing rules,
  materials, a customer lookup, the in-progress job list) is cached locally
  and refreshed whenever the device is online.

## Non-goals

- Real-time live sync between devices while both are online (seeing a
  colleague's change the instant they make it). Each device syncs on its own
  cycle; eventual consistency is enough.
- Automatic conflict resolution for edits that overwrite a field. Conflicts
  are detected and flagged for a person, never silently merged.
- Offline support for back-office screens used away from the shop floor:
  pricing rule publishing, payroll, staff account management, settings,
  analytics/reports. These require connectivity by design.
- Offline support on the public storefront or customer order-tracking pages.
  This is a staff/admin-app-only project.

## Anti-goals (would make this a failure even if it "works")

- Two devices both finishing payment on the same order, or both deducting the
  same roll of material, without either being visible afterward.
- A production-stage move or a customer edit silently lost because another
  device's edit won the merge.
- Staff having to understand sync internals to trust the app — "pending" vs
  "synced" has to be obvious without explanation.

## Constraints

- Reuse the row-locked-transaction, idempotency-key, and audit-log patterns
  already in `commerce.service.ts` and elsewhere, rather than building a
  parallel mechanism. The security audit already covered that code; a new
  parallel mutation path would need its own audit.
- Auth stays httpOnly-cookie based. No session token moves into client JS or
  IndexedDB.
- CSRF protection stays as-is: queued commands replay through the same
  endpoints with the same guards, which means the CSRF token used at replay
  time has to still be valid — see Open Point below.
- No CRDT or heavy state-sync library (ruled out when picking the approach).
  IndexedDB access can be hand-rolled against the native API or a thin
  wrapper; avoid adding a new runtime dependency unless the builder finds one
  clearly simpler than hand-rolling, and if so it should be small and
  single-purpose (an IndexedDB convenience wrapper, not a sync framework).
- Must not regress anything from the recent security audit.

## Approaches considered

**A. Command queue replayed through the existing API.** The client logs every
mutating action as a small, uniquely-ID'd command in IndexedDB. When back
online, each command replays through the same NestJS endpoints already in
place, which already do row-locked transactions and (for payments) idempotent
handling. A version number added to the handful of entities that get
overwritten (not just appended to) turns a conflicting edit into a flagged
case instead of a silent overwrite.

**B. A CRDT library (Automerge, Yjs, RxDB).** Give the client a full local
replica and let a conflict-free replication algorithm merge concurrent edits.
This is the standard answer for "many offline devices, shared data," but
CRDTs don't know that two people can't both validly finish paying off the
same order, or that two stock deductions can't be merged by taking the max —
the business-rule logic would still need to be written by hand, just inside
an unfamiliar library instead of the existing, already-reviewed service
layer, and all the safety properties already on the server (locking,
idempotency, audit) would need to be re-derived on the client in a different
form.

**C. A dumb replay queue with no conflict detection.** Queue raw requests,
replay them in order when back online. Simplest to build, but this is the
failure mode explicitly ruled out above: a production-stage move or a
customer edit from one device would silently overwrite another's.

**Picked: A.** Confirmed in conversation. It's the only option that keeps the
business-rule and safety logic in one place (the NestJS services) and reuses
work already done and already reviewed, rather than re-deriving it on the
client or in a generic library.

## The design (approach A, decided parts)

### Scope of what queues offline

In scope — the shop-floor flow:
- Create walk-in / salesperson order (`POST /orders`, staff flow)
- Record payment, record refund (`.../payment`, `.../refund`)
- Release to production (`.../release`)
- Move a production job's stage, add a job note (`production/jobs/:id`,
  `production/jobs/:id/activity`)
- Log material consumption, adjust material/product stock, record a physical
  count (`materials/:id/stock`, `materials/:id/count`,
  `products/:id/stock`, `products/:id/count`)
- Create or edit a customer (`POST /admin/customers`, `PATCH
  /admin/customers/:id`)

Out of scope (blocked offline, by choice, matching the non-goals above):
pricing rule create/draft/publish, payroll, employee/staff management,
business settings, quote-request status changes, analytics/report emails.
These show a plain "needs internet" state when offline rather than queuing.

### Entity versioning (for conflict detection)

Add an integer `version` column, starting at 1 and incremented on every
update, to: `Order`, `ProductionJob`, `Customer`, `MaterialItem`, `Product`.
These are the entities that get overwritten by a staff edit rather than only
appended to (payments and refunds are append-only rows, so they need no
version — two devices recording two different payments on the same order is
never a conflict, it's just two rows, already handled by the existing
idempotency/locking).

### The command envelope

Every queued action is one record in an IndexedDB object store:

```
{
  id: string            // client-generated UUID v4, assigned at creation, not at sync time
  type: string           // one of a fixed set matching an endpoint, e.g. 'order.create', 'job.move_stage'
  payload: object         // the same DTO shape the endpoint already accepts
  expectedVersion?: number // only for commands targeting a versioned entity
  deviceId: string        // generated once per browser install, stored in IndexedDB
  createdAt: string        // client clock, ISO timestamp
  status: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed'
}
```

`id` doubles as the idempotency key. This generalizes the `requestKey`
pattern already used for payments to every command type.

### Sync protocol

- A sync loop runs whenever the browser reports online and on a periodic
  timer as backup (the Background Sync API where available isn't reliable
  enough across browsers to be the only mechanism).
- Commands from one device replay in that device's own creation order.
  Across devices there is no global order — additive commands (payments,
  stock-consumption logs, job notes) don't need one; version-checked
  commands carry their own `expectedVersion` so the server can tell if
  they're stale regardless of arrival order.
- Each command replays against its existing endpoint, with `id` passed
  through as the idempotency key. The server checks a new dedupe table
  (`synced_command`: `id`, `deviceId`, `result` (JSON), `createdAt`) before
  applying — if `id` was already processed, the prior result is returned
  unchanged instead of reapplying. This is the same idea as the existing
  payment `requestKey` check, generalized into one shared mechanism so every
  command type gets it, not just payments.
- For a command with `expectedVersion`: the endpoint checks it against the
  entity's current `version` inside the same locked transaction it already
  uses. Mismatch → reject with 409 and the entity's current state; don't
  apply, don't increment anything. Match → apply and increment `version`.
- A 409 marks that command `conflict` in the local queue (never silently
  dropped or auto-retried) and raises a new Flag in the existing
  Controls/Flags screen, carrying both the stale command's intended change
  and the server's current state, for a person to resolve by hand.
- Every other failure (network drop mid-sync, 5xx) marks the command
  `failed` and retries with backoff; a `401` pauses the whole queue and
  prompts re-authentication without discarding anything queued.

### Reference data cache

A separate set of IndexedDB stores (not the command queue) mirrors: active
products, published pricing rules, material items, and a customer lookup
index. Refreshed opportunistically whenever the device is online (on load
and after each successful sync cycle). Forms read from this cache first and
fall back to it entirely when offline, so creating an order offline still has
a product list and pricing rules to work from.

### App-shell offline loading

A service worker caches the admin app's static assets (the same thing that
makes this a PWA in substance, whether or not it's installable/badged) so the
app itself loads with no network, not just a blank error page. API responses
are not cached by the service worker — the reference-data cache above is a
deliberate, typed IndexedDB mirror instead, so there's one clear place
staff-facing code reads cached data from, not an opaque HTTP cache.

**My call, required for the goal to actually hold:** today `main.tsx`'s
`Root()` calls `api.me()` on mount and falls straight to the login screen on
*any* failure, including a plain network error — so opening the app offline
currently looks logged-out even for an already-authenticated staffer. And
`App.load()`'s one big `Promise.all` across every list endpoint replaces the
whole UI with a blocking error screen if any call fails. Both have to change:
`Root()` must distinguish "no network" from "actually logged out" (fall back
to a locally cached user identity when the network call fails, not to the
login screen), and `App.load()` must fail soft per data source, falling back
to the reference-data cache per section above, rather than one failure
blanking the entire workspace. This is in scope for the builder, not an
optional nicety — without it the app still presents as broken or logged-out
offline even with the sync queue fully working underneath.

### Dedupe mechanism vs. existing idempotency columns

**My call, to honor the "don't touch already-audited code" constraint:**
`Order.requestKey`, `PaymentTransaction.reference`, and
`OrderRefund.requestKey` already give order-creation, payment, and refund
their own idempotency checks inside `commerce.service.ts` /
`order.service.ts` — code the recent security audit already covered. The new
`synced_command` dedupe table does not replace these. For those three command
types, the client sets the existing `requestKey` field on the DTO to the
command's own `id`, so the command ID *is* the existing idempotency key —
zero changes to that already-audited logic. The `synced_command` table only
covers command types that have no idempotency check today: job stage moves,
job notes, stock/material adjustments and counts, material consumption
logging, and customer create/edit.

### Delta-based offline stock and material adjustments

**Decided in conversation:** today's stock/material-count endpoints take an
absolute new value, computed client-side from whatever number was on screen.
Two offline edits on the same item would almost always conflict under that
model, even for ordinary sequential work. For the offline path specifically,
stock and material adjustments switch to a delta (+/-) command instead of an
absolute target — two different offline adjustments to the same item then
simply both apply, additive, with no conflict in the common case. The
existing online stock-adjust screens are unaffected; this change is scoped to
the new offline command type only. A genuine conflict can still arise if a
physical count (which is inherently absolute, not a delta) happens on one
device while a delta-based adjustment queues on another for the same item —
that case still uses the `version` check and gets flagged.

### CSRF failures during replay

**My call:** a stale/missing CSRF token produces a `403` from `CsrfGuard`,
not a `401`. Treat `403` the same as `401` in the sync loop: pause the queue
and refresh the session (re-running the equivalent of `/auth/me` to get a
fresh CSRF token) before resuming, rather than retrying with backoff
indefinitely, which would otherwise hang the queue in "failed" forever since
no amount of retrying fixes a stale token on its own.

### Status visibility

Orders, jobs, and customers show a small "saved on this device, not yet
synced" indicator while any command targeting them is still `pending` or
`syncing`, and a distinct "needs attention" indicator if any command on them
is `conflict`. Exact placement/visual treatment is left to the builder,
matching the rest of the admin app's existing patterns.

## Open point (my call, flagged for visibility)

Staff sessions currently expire after 8 hours (`admin_session` cookie
`maxAge`). If a device is offline for close to or beyond that window, its
queued commands will hit a 401 on reconnect. My call: treat this the same way
as any other failure — pause the queue, prompt re-login, keep everything
queued — rather than extending session lifetime, since widening the session
window is a security trade-off that's a separate decision from this project.
If staff regularly go offline for many hours at a stretch, that's worth
raising separately.

## What's left to the builder

- Exact TypeScript types/interfaces for the command envelope and the new
  `synced_command` dedupe entity/migration.
- Which specific IndexedDB access approach to use (native API vs. a small
  wrapper) — constrained above to "no heavy library."
- The retry/backoff timing and sync-loop interval.
- The exact UI treatment for "pending sync" / "conflict" indicators and the
  conflict-resolution screen in Controls/Flags.
- Migration plan for adding `version` columns to five existing tables with
  live data (default existing rows to `version = 1`).
- Test plan covering: two devices queuing conflicting commands on the same
  order/job and syncing in either order; a device offline across a session
  expiry; the dedupe table correctly short-circuiting a replayed command.
