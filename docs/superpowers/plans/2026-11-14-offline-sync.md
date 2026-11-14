# Offline-First Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let staff keep taking walk-in orders, recording payments, moving production jobs, and adjusting stock with no network, on any number of devices in the shop at once, and have every queued action sync afterward with zero duplicates and zero silently-lost edits.

**Architecture:** A command queue stored in IndexedDB on each device replays through the existing NestJS endpoints when back online. Three command types (order create, payment, refund) already have a `requestKey` idempotency field — the client just sets it to the command's own id. Everything else gets a new shared dedupe table keyed by command id. A `version` column on the five entities that get overwritten (not just appended to) turns a stale edit into a flagged conflict instead of a silent loss.

**Tech Stack:** NestJS + TypeORM (Postgres in prod, SQLite dev via `synchronize:true`), node --test with the existing stub-repository fixture style, React admin SPA, native IndexedDB (no new runtime dependency), a hand-written service worker for app-shell caching.

**Spec:** docs/superpowers/specs/2026-11-14-offline-sync-design.md

## Global Constraints

- Reuse the row-locked-transaction and audit-log patterns already in the codebase; don't build a parallel mutation path for order creation, payment, or refund (already-audited code — those three reuse their existing `requestKey` field unchanged).
- Auth stays httpOnly-cookie based; no session token in client JS or IndexedDB.
- No new runtime dependency for IndexedDB access or sync — hand-rolled against the native API.
- Offline scope is limited to: create walk-in/salesperson order, record payment/refund, release to production, move a production job's stage, add a job note, log material consumption, adjust product/material stock, record a physical count, create/edit a customer. Pricing rules, payroll, staff accounts, settings, and quote-status changes stay online-only (no queuing — calling them offline fails immediately with a clear "needs internet" message, no code change to those endpoints).
- Stock/material adjustments queued offline are delta-based (+/-); a physical count stays absolute and is the only one of the two that carries a version check.
- Plain one-line commit subjects, no bullet lists, no AI-sounding phrasing (repo convention).

## Review Focus

- A queued command targets a row that no longer exists (e.g. a product deleted online while another device queued a stock delta against it offline) — replay must return a clear rejection, not a crash. Covered in Task 5 (adjust/count) and Task 9 (sync engine's error handling of a 404 from replay).
- Two commands with the same id arrive from two different `deviceId`s (storage cleared and the queue resent from "new" device) — dedupe must key on command id alone, not id+deviceId, so this still short-circuits to the first result. Covered in Task 1.
- A sync batch has one command that 409s or 500s in the middle — later, unrelated commands in the same batch must still get their turn, not be blocked indefinitely behind the stuck one. Covered in Task 9.
- IndexedDB is unavailable or over quota (private browsing, storage pressure) — enqueuing a command must surface a clear error to the staff member immediately, not silently drop the action. Covered in Task 6 (`OfflineDbUnavailableError`) and Task 7 (`enqueueCommand` propagates it rather than swallowing it).
- A command queued against `ProductionJob`/`Customer`/order release is replayed twice in different sync passes because the first pass's success response was lost to a network drop right after the server committed — dedupe-by-id must still return the original result, not double-apply. Covered in Task 1, with concrete instances in Task 2 and Task 3.

---

## Task 1: Schema — version columns, synced_commands table, shared helpers

**Files:**
- Modify: `apps/api/src/entities.ts` (add `version` to `Order`, `ProductionJob`, `Customer`, `MaterialItem`, `Product`; add new `SyncedCommand` entity)
- Modify: `apps/api/src/app.module.ts` (register `SyncedCommand` in the entities array and the new migration in the migrations array)
- Create: `apps/api/src/migrations/1720000021000-OfflineSync.ts`
- Modify: `apps/api/src/db.ts` (add `dedupeCommand` and `assertVersion` helpers alongside the existing `lockedFindOne`)
- Test: `apps/api/test/sync-helpers.test.cjs`

**Interfaces:**
- Produces: `version!: number` column (default `1`) on `Order`, `ProductionJob`, `Customer`, `MaterialItem`, `Product`.
- Produces: `SyncedCommand { id: string (primary), deviceId: string, result: string, createdAt: Date }` in `entities.ts`.
- Produces: `dedupeCommand<T>(manager: EntityManager, id: string, deviceId: string, actorEmail: string, run: () => Promise<T>): Promise<T>` in `db.ts` — checks `SyncedCommand` by `id` only (not by `deviceId`); if found and `existing.actorEmail === actorEmail`, returns `JSON.parse(existing.result)`; if found with a different `actorEmail`, throws `ConflictException('Command id already used by a different actor')` rather than returning the cached result (fixed during Task 1's review — a command id is not an authorization boundary on its own); otherwise runs `run()`, saves a `SyncedCommand` row (including `actorEmail`) with `JSON.stringify(result)`, and returns `result`. Must be called with the same transactional `manager` the caller already has open.
- Produces: `assertVersion(current: number, expected: number | undefined): void` in `db.ts` — throws `ConflictException` (import from `@nestjs/common`) when `expected !== undefined && expected !== current`; no-op when `expected` is `undefined`.

- [ ] **Step 1: Write the failing tests**

```js
// apps/api/test/sync-helpers.test.cjs
test('dedupeCommand runs the function once and returns the same result on a repeated id', async () => { /* stub manager with a SyncedCommand repo Map; call dedupeCommand twice with same id, different deviceId each time; assert run() called once, both calls return the same result */ });
test('assertVersion throws ConflictException when expected does not match current', async () => { /* assert.throws(() => assertVersion(3, 2), /ConflictException/) via instanceof check */ });
test('assertVersion is a no-op when expected is undefined', async () => { /* assertVersion(3, undefined) does not throw */ });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && npm run build && node --test test/sync-helpers.test.cjs`
Expected: FAIL — `dedupeCommand`/`assertVersion` not exported from `db.ts`

- [ ] **Step 3: Implement the entities, migration, and helpers**

Follow the existing migration style in `apps/api/src/migrations/1720000020000-MaterialPhysicalCount.ts` (raw SQL, `up`/`down`, `CREATE TABLE IF NOT EXISTS`). Add `ALTER TABLE ... ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1` for each of the five tables, plus the `synced_commands` table (`id` varchar primary key — client-generated UUID, not `gen_random_uuid()`). Register the migration and `SyncedCommand` entity in `app.module.ts` exactly where the existing ones are listed.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/api && npm run build && node --test test/sync-helpers.test.cjs`
Expected: PASS, 3/3

- [ ] **Step 5: Run the full API suite**

Run: `cd apps/api && node --test test/*.test.cjs`
Expected: same 27 pre-existing unrelated failures as before this task, no new ones; pass count up by 3.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/entities.ts apps/api/src/app.module.ts apps/api/src/db.ts apps/api/src/migrations/1720000021000-OfflineSync.ts apps/api/test/sync-helpers.test.cjs
git commit -m "Add version columns and a shared command-dedupe table"
```

---

## Task 2: Release-to-production dedupe and version check

**Files:**
- Modify: `apps/api/src/dto.ts` (`ReleaseOrderDto` gets `commandId?: string`, `deviceId?: string`, and `expectedVersion?: number`)
- Modify: `apps/api/src/order.service.ts` (`releaseOrderToProduction`)
- Modify: `apps/api/src/order.controller.ts` (the `:id/release` route, pass the new fields through)
- Test: `apps/api/test/release-order-sync.test.cjs`

**Interfaces:**
- Consumes: `dedupeCommand`, `assertVersion` from Task 1's `db.ts`.
- Produces: `releaseOrderToProduction(orderId: string, actor: string, override?: {reason: string}, sync?: {commandId: string, deviceId: string, expectedVersion?: number})` — when `sync` is passed, wraps the existing transactional body in `dedupeCommand(manager, sync.commandId, sync.deviceId, actor, () => ...)` (the method's own `actor` parameter is the actorEmail), and calls `assertVersion(order.version, sync.expectedVersion)` right after the existing `lockedFindOne` load of the order, before any mutation. On success, increments `order.version` by 1 alongside the existing save.

- [ ] **Step 1: Write the failing tests**

```js
test('releasing the same order twice with the same commandId only releases it once', async () => { /* call releaseOrderToProduction twice with identical sync.commandId; assert production jobs created once, both calls resolve to the same result */ });
test('releasing with a stale expectedVersion is rejected and nothing changes', async () => { /* order.version is 1; call with expectedVersion:2; assert ConflictException thrown and order status unchanged */ });
test('releasing with a matching expectedVersion succeeds and bumps the version', async () => { /* expectedVersion:1 on a version:1 order; assert result.version === 2 */ });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && npm run build && node --test test/release-order-sync.test.cjs`
Expected: FAIL — `sync` param not recognized / version not incremented

- [ ] **Step 3: Implement the DTO fields and service/controller changes**

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/api && npm run build && node --test test/release-order-sync.test.cjs`
Expected: PASS, 3/3

- [ ] **Step 5: Run the full API suite**

Run: `cd apps/api && node --test test/*.test.cjs`
Expected: same 27 pre-existing failures, pass count up by 3.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/dto.ts apps/api/src/order.service.ts apps/api/src/order.controller.ts apps/api/test/release-order-sync.test.cjs
git commit -m "Dedupe and version-check order release for offline replay"
```

---

## Task 3: Production job stage move dedupe and version check

**Files:**
- Modify: `apps/api/src/dto.ts` (`UpdateProductionJobDto` gets `commandId?: string`, `deviceId?: string`, and `expectedVersion?: number`)
- Modify: `apps/api/src/order.service.ts` (`updateProductionJob`)
- Modify: `apps/api/src/order.controller.ts` (`production/jobs/:id` PATCH route)
- Test: `apps/api/test/production-job-sync.test.cjs`

**Interfaces:**
- Consumes: `dedupeCommand`, `assertVersion` from Task 1.
- Produces: `updateProductionJob(id: string, dto: UpdateProductionJobDto, actor: string, role: string)` unchanged in signature — `dto.commandId`/`dto.expectedVersion` are read from the existing `dto` parameter, not added as new parameters, since both already flow through one object. Same wrap-in-`dedupeCommand` and `assertVersion(job.version, dto.expectedVersion)` pattern as Task 2, version bump on save.
- Note: `AddProductionJobNoteDto` (the separate job-notes endpoint) is append-only and gets no version field — confirm in Step 1 that notes aren't touched by this task.

- [ ] **Step 1: Write the failing tests**

```js
test('moving a job to the same stage twice with the same commandId only applies once', async () => { /* same pattern as Task 2 */ });
test('moving a job with a stale expectedVersion is rejected and the stage is unchanged', async () => { /* */ });
test('moving a job with a matching expectedVersion succeeds and bumps the version', async () => { /* */ });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && npm run build && node --test test/production-job-sync.test.cjs`
Expected: FAIL

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/api && npm run build && node --test test/production-job-sync.test.cjs`
Expected: PASS, 3/3

- [ ] **Step 5: Run the full API suite**

Run: `cd apps/api && node --test test/*.test.cjs`
Expected: same 27 pre-existing failures, pass count up by 3.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/dto.ts apps/api/src/order.service.ts apps/api/src/order.controller.ts apps/api/test/production-job-sync.test.cjs
git commit -m "Dedupe and version-check production job stage moves"
```

---

## Task 4: Customer create/update dedupe and version check

**Files:**
- Modify: `apps/api/src/dto.ts` (`CreateCustomerDto` gets `commandId?: string` and `deviceId?: string`; `UpdateCustomerDto` gets `commandId?: string`, `deviceId?: string`, and `expectedVersion?: number`)
- Modify: `apps/api/src/customer.service.ts` (`createCustomer`, `updateCustomer`)
- Modify: `apps/api/src/people.controller.ts` (the two customer routes)
- Test: `apps/api/test/customer-sync.test.cjs`

**Interfaces:**
- Consumes: `dedupeCommand`, `assertVersion` from Task 1.
- Produces: `createCustomer(dto: CreateCustomerDto, actorEmail: string)` wraps its body in `dedupeCommand` when `dto.commandId` is present (no version check — it's a new row).
- Produces: `updateCustomer(id: string, dto: UpdateCustomerDto, actorEmail: string)` wraps its body in `dedupeCommand` when `dto.commandId` is present, and calls `assertVersion(customer.version, dto.expectedVersion)` right after loading the customer, before the existing duplicate-email check. Version bump on save.

- [ ] **Step 1: Write the failing tests**

```js
test('creating a customer twice with the same commandId creates it only once', async () => { /* */ });
test('updating a customer with a stale expectedVersion is rejected and the record is untouched', async () => { /* */ });
test('updating a customer with a matching expectedVersion succeeds and bumps the version', async () => { /* */ });
test('updating a customer twice with the same commandId applies the change only once', async () => { /* */ });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && npm run build && node --test test/customer-sync.test.cjs`
Expected: FAIL

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/api && npm run build && node --test test/customer-sync.test.cjs`
Expected: PASS, 4/4

- [ ] **Step 5: Run the full API suite**

Run: `cd apps/api && node --test test/*.test.cjs`
Expected: same 27 pre-existing failures, pass count up by 4.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/dto.ts apps/api/src/customer.service.ts apps/api/src/people.controller.ts apps/api/test/customer-sync.test.cjs
git commit -m "Dedupe and version-check customer create and update"
```

---

## Task 5: Delta-based offline stock/material adjustments, version-checked physical counts

**Files:**
- Modify: `apps/api/src/dto.ts` (`AdjustStockDto` and `AdjustMaterialStockDto` get `delta?: boolean`, `commandId?: string`, and `deviceId?: string`; `RecordPhysicalCountDto` gets `commandId?: string`, `deviceId?: string`, and `expectedVersion?: number`)
- Modify: `apps/api/src/controllers.ts` (the `products/:id/count` and `materials/:id/count` routes currently destructure individual DTO fields when calling `recordPhysicalCount` instead of passing `dto` through — update both call sites to also pass `dto.commandId`, `dto.deviceId`, and `dto.expectedVersion`)
- Modify: `apps/api/src/admin.service.ts` (`adjust` for products)
- Modify: `apps/api/src/material.service.ts` (`adjust` for materials, `recordPhysicalCount` for both)
- Test: `apps/api/test/stock-sync.test.cjs`

**Interfaces:**
- Consumes: `dedupeCommand`, `assertVersion` from Task 1.
- Produces: `AdjustStockDto.stock` and `AdjustMaterialStockDto.stockQuantity` are read as an absolute target when `dto.delta` is falsy (today's behavior, unchanged), and as a signed amount added to the current quantity when `dto.delta` is `true`. Reject (clamp is wrong here — `BadRequestException`) if a delta adjustment would take the quantity below 0.
- Produces: both `adjust` methods wrap their body in `dedupeCommand(manager, dto.commandId, dto.deviceId, email, ...)` when `dto.commandId` is present (the method's own `email` parameter is the actorEmail). Version increments on every successful adjust (delta or absolute), but delta adjustments never check `expectedVersion` (none is sent) — only `recordPhysicalCount` checks `assertVersion(target.version, dto.expectedVersion)` before computing `accountedForPercent`, since a count is the one absolute, non-commutative case that can race against a queued delta.
- Produces: `recordPhysicalCount(targetKind, targetId, measuredQuantity, actorEmail, note, sync?: {commandId: string, deviceId: string, expectedVersion?: number})` — signature gains the optional `sync` parameter; existing callers (the controller routes) pass it through from the DTO.

- [ ] **Step 1: Write the failing tests**

```js
test('a delta adjustment of +5 on a stock of 10 results in 15', async () => { /* */ });
test('a delta adjustment that would take stock below zero is rejected', async () => { /* */ });
test('two delta adjustments with different commandIds from different devices both apply, additively', async () => { /* */ });
test('a repeated delta adjustment with the same commandId only applies once', async () => { /* */ });
test('a physical count with a stale expectedVersion is rejected', async () => { /* */ });
test('an absolute (non-delta) adjustment still behaves exactly as before', async () => { /* regression: existing online behavior unchanged */ });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && npm run build && node --test test/stock-sync.test.cjs`
Expected: FAIL

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/api && npm run build && node --test test/stock-sync.test.cjs`
Expected: PASS, 6/6

- [ ] **Step 5: Run the full API suite**

Run: `cd apps/api && node --test test/*.test.cjs`
Expected: same 27 pre-existing failures, pass count up by 6.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/dto.ts apps/api/src/admin.service.ts apps/api/src/material.service.ts apps/api/test/stock-sync.test.cjs
git commit -m "Support delta-based stock adjustments and version-checked counts"
```

---

## Task 6: IndexedDB wrapper and device identity

**Files:**
- Create: `apps/admin/src/offline/db.ts`
- Test: `apps/admin/src/offline/db.test.ts` (check the admin app's test runner config — if there is none yet for frontend unit tests, add the minimal one this test needs, e.g. `vitest` with `fake-indexeddb`; follow whatever the admin `package.json` already has before adding anything)

**Interfaces:**
- Produces: `openOfflineDb(): Promise<IDBDatabase>` — opens (creating on first run) a database named `vikipat-offline` with object stores `commands` (keyPath `id`), `referenceCache` (keyPath `key`), and `meta` (keyPath `key`).
- Produces: `getDeviceId(): Promise<string>` — reads `meta` for key `'deviceId'`; if absent, generates one with `crypto.randomUUID()`, stores it, returns it. Stable across reloads for the same browser profile.
- Produces: `OfflineDbUnavailableError` — a named error class thrown by `openOfflineDb()` when `indexedDB` is undefined or opening it throws (private browsing, quota), so callers can show a clear message instead of an unhandled rejection.

- [ ] **Step 1: Write the failing tests**

```ts
test('getDeviceId returns the same id on a second call', async () => { /* */ });
test('openOfflineDb throws OfflineDbUnavailableError when indexedDB is unavailable', async () => { /* stub indexedDB as undefined */ });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: (the test command this task's Step 1 settled on)
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run tests to verify they pass**

Run: (same command)
Expected: PASS, 2/2

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/offline/db.ts apps/admin/src/offline/db.test.ts apps/admin/package.json
git commit -m "Add an IndexedDB wrapper and stable device id for offline storage"
```

---

## Task 7: Command queue

**Files:**
- Create: `apps/admin/src/offline/queue.ts`
- Test: `apps/admin/src/offline/queue.test.ts`

**Interfaces:**
- Consumes: `openOfflineDb`, `getDeviceId`, `OfflineDbUnavailableError` from Task 6.
- Produces: `type QueuedCommand = { id: string; type: string; payload: object; expectedVersion?: number; deviceId: string; createdAt: string; status: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed'; }`.
- Produces: `enqueueCommand(type: string, payload: object, expectedVersion?: number): Promise<QueuedCommand>` — assigns `id` via `crypto.randomUUID()`, `deviceId` via `getDeviceId()`, `createdAt` via `new Date().toISOString()`, `status: 'pending'`, stores it, returns it. Propagates `OfflineDbUnavailableError` from Task 6 rather than swallowing it.
- Produces: `listCommands(status?: QueuedCommand['status']): Promise<QueuedCommand[]>` — all commands, or filtered by status, ordered by `createdAt` ascending.
- Produces: `updateCommandStatus(id: string, status: QueuedCommand['status'], extra?: object): Promise<void>` — merges `extra` fields (e.g. a conflict's server-side current state) onto the stored record alongside the new status.

- [ ] **Step 1: Write the failing tests**

```ts
test('enqueueCommand stores a pending command retrievable by listCommands', async () => { /* */ });
test('listCommands filtered by status only returns matching commands', async () => { /* */ });
test('updateCommandStatus changes status and merges extra fields without losing the rest', async () => { /* */ });
test('commands from listCommands come back ordered by createdAt ascending', async () => { /* */ });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: (Task 6's test command, same runner)
Expected: FAIL

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run tests to verify they pass**

Run: (same command)
Expected: PASS, 4/4

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/offline/queue.ts apps/admin/src/offline/queue.test.ts
git commit -m "Add the offline command queue"
```

---

## Task 8: Reference data cache

**Files:**
- Create: `apps/admin/src/offline/referenceCache.ts`
- Test: `apps/admin/src/offline/referenceCache.test.ts`

**Interfaces:**
- Consumes: `openOfflineDb` from Task 6; the existing `api` client's `products()`, `pricingRules()`, `materials()`, `customers()` functions from `apps/admin/src/api.ts` (read that file's exact exported names before writing this task's implementation).
- Produces: `refreshReferenceCache(api: typeof import('../api').api): Promise<void>` — calls each of the four list endpoints and stores each result under its own `referenceCache` key (`'products'`, `'pricingRules'`, `'materials'`, `'customers'`); on any individual call failing, still stores whichever succeeded and does not throw (fail-soft, per the design's "App.load() fails soft per source" decision).
- Produces: `readCachedReference<T>(key: 'products' | 'pricingRules' | 'materials' | 'customers'): Promise<T | undefined>`.

- [ ] **Step 1: Write the failing tests**

```ts
test('refreshReferenceCache stores each list under its own key', async () => { /* stub api client */ });
test('refreshReferenceCache keeps previously-cached data for a source that fails to refresh', async () => { /* one of the four api calls rejects; assert readCachedReference for that key still returns the old value, others got the new one */ });
test('readCachedReference returns undefined for a key that was never cached', async () => { /* */ });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: (Task 6's test command)
Expected: FAIL

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run tests to verify they pass**

Run: (same command)
Expected: PASS, 3/3

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/offline/referenceCache.ts apps/admin/src/offline/referenceCache.test.ts
git commit -m "Add an offline reference-data cache for products, pricing, materials and customers"
```

---

## Task 9: Sync engine

**Files:**
- Create: `apps/admin/src/offline/sync.ts`
- Test: `apps/admin/src/offline/sync.test.ts`

**Interfaces:**
- Consumes: `listCommands`, `updateCommandStatus`, `QueuedCommand` from Task 7.
- Consumes: a command-to-endpoint map the implementer writes in this file, e.g. `{ 'order.create': api.createOrder, 'payment.record': ... }` — read `apps/admin/src/api.ts` for the exact existing function names/signatures before writing this map; each command's `payload` must already carry whatever field that endpoint needs as its idempotency key (`requestKey` for order/payment/refund, `commandId` for everything else, per Task 2–5's backend contracts) — Task 10 is responsible for setting that field when it enqueues, not this task.
- Produces: `runSyncPass(): Promise<{ synced: number; conflicts: number; failed: number }>` — loads all `pending` and `failed` commands via `listCommands`, and for each (continuing past a failed/conflicted one rather than stopping the batch, per the Review Focus item on head-of-line blocking): marks it `syncing`, calls its mapped endpoint, and on
  - success: marks it `synced`.
  - a thrown error whose `status` is `409`: marks it `conflict`, stores the server's returned current-state body as `extra`, and calls `raiseConflictFlag(command: QueuedCommand, serverState: object): void` — does not retry automatically.
- Produces: `raiseConflictFlag(command: QueuedCommand, serverState: object): void` — a plain, synchronous, exported placeholder in this file that does nothing beyond being callable (e.g. logs to console) in this task. Task 11 replaces its body to actually create a Flag; it does not change this function's name or signature, so nothing calling it needs to change.
  - a thrown error whose `status` is `401` or `403`: stops the pass immediately (does not keep processing later commands) and returns with however many were processed so far; the caller (Task 12) is responsible for re-authenticating before the next pass.
  - any other error (network failure, 5xx): marks it `failed` and continues to the next command.
- Produces: `startSyncLoop(intervalMs: number): () => void` — runs `runSyncPass()` once immediately, again on every `window.online` event, and again every `intervalMs` as a backstop; returns a function that stops the loop (clears the interval and removes the listener).

- [ ] **Step 1: Write the failing tests**

```ts
test('a successful command is marked synced', async () => { /* */ });
test('a 409 marks the command conflict, stores the server state, and does not retry it on the next pass', async () => { /* */ });
test('a 401 stops the pass without processing later queued commands', async () => { /* two commands queued; first endpoint throws a 401; assert second was never called and runSyncPass resolved anyway */ });
test('a command that previously failed is retried on the next pass', async () => { /* */ });
test('one command conflicting does not stop a later, unrelated command in the same pass from syncing', async () => { /* the Review Focus head-of-line-blocking case */ });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: (Task 6's test command)
Expected: FAIL

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run tests to verify they pass**

Run: (same command)
Expected: PASS, 5/5

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/offline/sync.ts apps/admin/src/offline/sync.test.ts
git commit -m "Add the offline sync engine"
```

---

## Task 10: Wire mutating api.ts calls to enqueue offline

**Files:**
- Modify: `apps/admin/src/api.ts`

**Interfaces:**
- Consumes: `enqueueCommand` from Task 7.
- Produces: for each in-scope mutating call (`createOrder`, the payment/refund recording call, `releaseOrder`, `updateProductionJob`, the job-note call, the material-consumption call, `createCustomer`, `updateCustomer`, the product/material stock-adjust and record-count calls — confirm each one's exact current name in `api.ts` before changing it): on a network failure (not an HTTP error response — a thrown `TypeError`/`fetch` rejection, which is how a true offline failure surfaces, as distinct from a 4xx/5xx the server actually answered), the call instead generates a command id (`crypto.randomUUID()`), sets it onto the payload's `requestKey` field (order create, payment, refund) or `commandId` field (everything else) and, for the version-checked ones, its current cached `version` as `expectedVersion`, calls `enqueueCommand(...)`, and returns the locally-queued command's data to the caller instead of throwing — the caller's existing success path runs, with the UI's "pending sync" indicator (Task 12) reflecting the real status.
- An HTTP error response (the server was reachable and said no — a 400, a 409, a real validation failure) is not queued; it still throws/rejects exactly as today, since queuing it would hide a rejection that's already final and not a connectivity issue.

- [ ] **Step 1: Write the failing tests**

```ts
test('createOrder enqueues a command and resolves instead of throwing when the network is unreachable', async () => { /* stub fetch to reject with a TypeError */ });
test('createOrder still throws on a real 400 response rather than queuing it', async () => { /* stub fetch to resolve with status 400 */ });
test('updateProductionJob sets commandId and expectedVersion on the queued payload', async () => { /* */ });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: (admin's chosen frontend test command from Task 6)
Expected: FAIL

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run tests to verify they pass**

Run: (same command)
Expected: PASS, 3/3

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/api.ts apps/admin/src/api.test.ts
git commit -m "Queue mutating API calls offline instead of failing them"
```

---

## Task 11: Conflict flags in Controls

**Files:**
- Modify: `apps/api/src/material.service.ts` or wherever the existing Flags are raised (read the Controls/Flags backend source first — it was built in the `internal-controls-system` work; find the exact flag-raising function and its shape before adding a new one)
- Modify: `apps/admin/src/offline/sync.ts` (the `raiseConflictFlag` call stubbed in Task 9)
- Create/Modify: whatever endpoint the Flags screen already reads from, to also surface sync conflicts
- Test: matches whichever side (backend or frontend) ends up owning flag creation — read the existing Flags code first to decide

**Interfaces:**
- Consumes: the existing Flags data shape and screen (`Controls.tsx`'s Flags tab) — do not build a parallel conflicts UI; extend the existing one. Consumes `raiseConflictFlag`'s placeholder signature from Task 9 — replace its body only, keep the name and signature so Task 9's call site needs no change.
- Produces: a sync conflict appears in the same Flags list as material shortfalls and the other existing flag categories, carrying the queued command's intended change and the server's current state, with enough detail for a person to decide what to do by hand.

- [ ] **Step 1: Write the failing test**

(Exact test depends on which side raises the flag — read the existing flag-raising code first, then write one test proving a sync conflict appears in the Flags list with both the stale command's payload and the server's current state visible.)

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS

- [ ] **Step 5: Run the full relevant suite(s)**

Expected: no new failures beyond the 27 pre-existing ones (if backend touched) / clean build (if frontend-only).

- [ ] **Step 6: Commit**

```bash
git commit -m "Surface sync conflicts in the existing Flags screen"
```

---

## Task 12: Resilient auth bootstrap and data load

**Files:**
- Modify: `apps/admin/src/main.tsx` (`Root()` and `App.load()`)

**Interfaces:**
- Consumes: `getDeviceId`/`openOfflineDb` (Task 6) for a small `cachedUser` meta entry; `readCachedReference` (Task 8); `runSyncPass`/`startSyncLoop` (Task 9, started once a user is resolved).
- Produces: `Root()` on a network failure from `api.me()` (distinguish from a real 401, which does mean logged out) falls back to a `cachedUser` value written on the last successful `api.me()`/`api.login()`, instead of unconditionally calling `setUser(null)`.
- Produces: `App.load()` fetches each data source independently (not one blocking `Promise.all`) and, per source that fails, falls back to `readCachedReference` for the four sources Task 8 caches, and to an empty/last-known list for the others — never replaces the whole screen with the current blocking error state for a network failure specifically (a real non-network error on a single source still surfaces, but scoped to that source, not the whole app).

- [ ] **Step 1: Write the failing tests**

```ts
test('Root falls back to the cached user on a network failure from api.me()', async () => { /* */ });
test('Root still logs out on a real 401 from api.me()', async () => { /* */ });
test('App.load falls back to cached reference data when the products call fails on a network error', async () => { /* */ });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: (admin's frontend test command)
Expected: FAIL

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run tests to verify they pass**

Run: (same command)
Expected: PASS, 3/3

- [ ] **Step 5: Confirm the admin app still builds clean**

Run: `cd apps/admin && npm run build`
Expected: no TypeScript errors

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/main.tsx apps/admin/src/main.test.tsx
git commit -m "Keep the admin app usable offline instead of showing logged-out or broken"
```

---

## Task 13: Service worker for app-shell offline loading

**Files:**
- Create: `apps/admin/public/sw.js`
- Modify: `apps/admin/src/main.tsx` or a new small `apps/admin/src/registerServiceWorker.ts` (register on load)
- Modify: `apps/admin/vite.config.ts` only if the build needs to know about `sw.js` explicitly (check first — a file already in `public/` is normally copied as-is by Vite with no config change needed)

**Interfaces:**
- Produces: `sw.js` — on `install`, caches the built `index.html`, its JS/CSS bundle paths (read from the actual `dist/` output names, which are content-hashed — the install handler should cache whatever the fetch of `/` and its referenced assets returns, a standard cache-first-for-static-assets / network-first-for-navigation pattern), so a full page load with no network still renders the app shell.
- Produces: registration code that calls `navigator.serviceWorker.register('/sw.js')` once, guarded by `if ('serviceWorker' in navigator)`.

- [ ] **Step 1: Build the admin app and confirm the service worker loads**

Run: `cd apps/admin && npm run build && npm run preview` (or equivalent), then in a browser: load the app once online, go offline (devtools network throttling), reload.
Expected: the app shell still renders (login screen or workspace, per Task 12's cached-user fallback) instead of the browser's own offline error page.

- [ ] **Step 2: Commit**

```bash
git add apps/admin/public/sw.js apps/admin/src/registerServiceWorker.ts apps/admin/src/main.tsx
git commit -m "Cache the app shell so it loads with no network"
```

---

## Task 14: Pending-sync and conflict indicators in the UI

**Files:**
- Modify: `apps/admin/src/OrdersWorkspace.tsx`, `apps/admin/src/Customers.tsx`, and wherever production jobs render in `apps/admin/src/main.tsx`'s Operations view
- Test: component-level tests matching whatever pattern (if any) already exists for these files — if none exists, a manual verification step is acceptable for pure presentational additions; note that explicitly rather than inventing a test framework for one task

**Interfaces:**
- Consumes: `listCommands` from Task 7, filtered to commands whose `payload` references the record being displayed (match on the id field already present in each command type's payload).
- Produces: a small badge/label on an order, job, or customer row/detail view reading "Saved on this device" while any of its commands are `pending`/`syncing`, and "Needs attention" (linking to the Flags screen from Task 11) while any are `conflict`. No badge when everything concerning that record is `synced` or there are no queued commands for it.

- [ ] **Step 1: Implement the indicator in each of the three views, following that file's existing component style**

- [ ] **Step 2: Verify manually**

Run: `cd apps/admin && npm run dev`, queue a command (simulate offline via devtools), confirm the badge appears on the right record and clears after a successful sync pass.

- [ ] **Step 3: Confirm the admin app still builds clean**

Run: `cd apps/admin && npm run build`
Expected: no TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/OrdersWorkspace.tsx apps/admin/src/Customers.tsx apps/admin/src/main.tsx
git commit -m "Show pending-sync and conflict status on orders, jobs and customers"
```
