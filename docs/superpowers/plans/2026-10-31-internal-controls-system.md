# Internal Controls / Leakage-Detection System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make unrecorded ("ghost") jobs at Vikipat leave a detectable trace — close the payment-before-release gap, add a material/consumption log, and surface three owner-facing review reports plus a daily digest.

**Architecture:** Additive TypeORM entities + Postgres migrations (SQLite dev uses `synchronize: true` and needs no migration), new read-mostly service methods following the existing `AdminService`/`PeopleService` style, new endpoints under the existing `admin/*` controllers guarded by the existing `AdminOnlyGuard`/`AuthGuard` stack, and one new admin-only nav view (`controls`) in the existing React admin app, tabbed like `People.tsx`.

**Tech Stack:** NestJS + TypeORM (Postgres in prod, SQLite in dev) on the API; React + Vite, no router, hash-based view switch on the admin app. Tests: `node --test` against the compiled `apps/api/dist`, mirroring `apps/api/test/production-visibility.test.cjs`'s stub-repository style.

**Spec:** `docs/superpowers/specs/2026-10-31-internal-controls-system.md`

## Global Constraints

- Production runs Postgres with `migrationsRun: true`; every new table/column needs a migration registered in `apps/api/src/app.module.ts`'s `entities` array and (for Postgres) its `migrations` array, following the exact pattern already there — do not touch `synchronize` for either dialect.
- Migrations use `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` with `uuid PRIMARY KEY DEFAULT gen_random_uuid()` and `timestamptz NOT NULL DEFAULT now()`, exactly as `1720000009000-CustomersPeopleAndRefunds.ts` does — this is Postgres-only SQL; SQLite dev never runs it.
- New admin-facing views/endpoints are visible only to `role==='admin'`, via the existing `user.role==='admin'` checks already in `apps/admin/src/main.tsx` (`Sidebar`'s `nav.filter` and `App`'s hash-routing guard) — do not invent new role plumbing for visibility.
- The payment-before-release change applies to every order source, no exceptions baked into the code — only the explicit, logged override path bypasses it.
- Attendance cross-checking and reconciliation numbers are reports only; nothing in this plan may block a production-job stage change or a release based on them.
- Money stays in pesewas (integers) everywhere, matching every existing entity.
- All new TypeScript must pass `npx tsc --noEmit` in both `apps/api` and `apps/admin` before a task is considered done.

## Review Focus

- An order with no `customerPhone` or with WhatsApp notifications disabled must not throw when `queueWhatsApp` is called at order creation — `queueWhatsApp` already early-returns in both cases; a test must call it in both states and assert no throw.
- A release override with an empty/whitespace-only reason must be rejected server-side, not just discouraged in the UI — the DTO validation must enforce `@Length` with a real minimum, not rely on the admin UI never sending one.
- The late-cancellation/refund flag must not fire for an order cancelled *before* ever reaching `ready_for_production` (e.g. cancelled at `pending_review`) — a legitimate, ordinary cancellation must produce zero false flags.
- Logging material consumption against a job must fail cleanly (no partial write) if the material's stock would go negative or the job/material doesn't exist — the stock decrement and the stock-activity row must be in one transaction with the consumption row, mirroring how `AdminService.adjust` keeps `Product.stock` and `StockActivity` in lockstep today.
- The reconciliation endpoint must handle a service code with zero logged consumption (new material, nothing logged yet) and zero released jobs (new service) without dividing by zero or throwing — both lists should just come back empty for that code.

---

## Task 1: `jobs.release_unpaid` permission

**Files:**
- Modify: `packages/domain/src/permissions.ts`
- Test: `apps/api/test/permissions.test.cjs` — `packages/domain` has no test runner, no test files and no test dependency of its own (confirmed: its `package.json` has only a `build` script). `@vikipat/domain` is already a dependency of `@vikipat/api`, which already runs `node --test` on `apps/api/test/*.test.cjs`, so the test belongs there rather than inventing a new runner for a package that's never had one.

**Interfaces:**
- Produces: `'jobs.release_unpaid'` added as a member of `PERMISSIONS` (and thus `Permission`), available to `admin` and `operations_supervisor` automatically (both already receive the full `PERMISSIONS` array) and to no other `StaffRole`.

- [ ] **Step 1: Write the failing test**

Create `apps/api/test/permissions.test.cjs`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hasPermission } = require('@vikipat/domain');

test('operations_supervisor can release unpaid orders, a production operator cannot', () => {
  assert.equal(hasPermission('operations_supervisor', 'jobs.release_unpaid'), true);
  assert.equal(hasPermission('production_operator', 'jobs.release_unpaid'), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build:packages && node --test apps/api/test/permissions.test.cjs`
Expected: FAIL — `hasPermission` returns `false` for `operations_supervisor` too, since `'jobs.release_unpaid'` doesn't exist yet.

- [ ] **Step 3: Add `'jobs.release_unpaid'` to `PERMISSIONS` in `packages/domain/src/permissions.ts`**

Add it as a new array element; no other change to `rolePermissions` is needed since `admin` and `operations_supervisor` already spread the whole `PERMISSIONS` constant.

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2.
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/permissions.ts apps/api/test/permissions.test.cjs
git commit -m "domain: add jobs.release_unpaid permission"
```

---

## Task 2: Payment-before-release gate, with a logged override

**Files:**
- Create: `apps/api/src/migrations/1720000015000-ReleaseOverrides.ts`
- Modify: `apps/api/src/entities.ts` (new `ReleaseOverride` entity)
- Modify: `apps/api/src/app.module.ts` (register entity + migration, same pattern as every other entry)
- Modify: `apps/api/src/production-release.ts` (`releaseProductionJobs` signature and gate)
- Modify: `apps/api/src/order.service.ts` (`releaseOrderToProduction` passes the override through)
- Modify: `apps/api/src/order.controller.ts` (`AdminOrderController.release`)
- Modify: `apps/api/src/dto.ts` (new `ReleaseOrderDto`)
- Modify: `apps/admin/src/api.ts` (`releaseOrder` takes an optional override body)
- Modify: `apps/admin/src/main.tsx` (override UI, inside `Operations` and its `onRelease` wiring in `App`)
- Test: `apps/api/test/production-release.test.cjs`

**Interfaces:**
- Produces: `ReleaseOverride` entity — `id, orderId, orderNumber, reason, actorEmail, createdAt`.
- Produces: `releaseProductionJobs(manager: EntityManager, orderId: string, actor: string, override?: { reason: string }): Promise<{ jobs: ProductionJob[]; notificationIds: string[] }>` — same return shape as today, fourth parameter is new and optional.
- Produces: `OrderService.releaseOrderToProduction(orderId: string, actor?: string, override?: { reason: string }): Promise<ProductionJob[]>`.
- Produces: `ReleaseOrderDto { overrideReason?: string }` in `dto.ts`, `@IsOptional() @IsString() @Length(10, 500) @Matches(/\S/) overrideReason?: string` — the `@Matches(/\S/)` follows the same whitespace-rejection convention already used elsewhere in this file (e.g. `CreateStaffDto.name`), since `@Length` alone would accept 10 spaces as a valid reason.
- Consumes: `Permission` from Task 1 (`'jobs.release_unpaid'`).

- [ ] **Step 1: Write the failing tests**

In `apps/api/test/production-release.test.cjs`, following the stub-manager style of `production-visibility.test.cjs` (a `jobs.manager.transaction`-style fixture isn't quite right here since `releaseProductionJobs` takes the manager directly — build a minimal fake `EntityManager` whose `getRepository` returns stub repos for `Order`, `OrderItem`, `ProductionJob`, `ProductionJobActivity`, `OrderStatusHistory`, `NotificationOutbox`, `StoreSettings`, `ReleaseOverride`):

```js
test('a walk-in order with no payment recorded cannot be released without an override', async () => {
  const { manager, state } = fixture({ source: 'walk_in', paymentStatus: 'unpaid' });
  await assert.rejects(releaseProductionJobs(manager, 'order', 'staff'), /Payment must be recorded/);
  assert.equal(state.jobs.length, 0);
});

test('an override reason releases an unpaid order and records who and why', async () => {
  const { manager, state } = fixture({ source: 'walk_in', paymentStatus: 'unpaid' });
  await releaseProductionJobs(manager, 'order', 'supervisor@vikipat.com', { reason: 'Corporate account, invoiced monthly' });
  assert.equal(state.jobs.length > 0, true);
  assert.equal(state.releaseOverrides[0].reason, 'Corporate account, invoiced monthly');
  assert.equal(state.releaseOverrides[0].actorEmail, 'supervisor@vikipat.com');
});

test('a paid order releases with no override needed', async () => {
  const { manager, state } = fixture({ source: 'online', paymentStatus: 'paid' });
  await releaseProductionJobs(manager, 'order', 'staff');
  assert.equal(state.jobs.length > 0, true);
  assert.equal(state.releaseOverrides.length, 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run build:packages && npm run build -w @vikipat/api && node --test apps/api/test/production-release.test.cjs`
Expected: FAIL — current code only exempts `walk_in`/`salesperson` sources, so the first test's rejection doesn't happen, and `override`/`ReleaseOverride` don't exist yet.

- [ ] **Step 3: Add the `ReleaseOverride` entity to `apps/api/src/entities.ts`**

```ts
@Entity('release_overrides')
export class ReleaseOverride {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column() orderId!: string;
  @Column() orderNumber!: string;
  @Column('text') reason!: string;
  @Column() actorEmail!: string;
  @CreateDateColumn() createdAt!: Date;
}
```

- [ ] **Step 4: Write `apps/api/src/migrations/1720000015000-ReleaseOverrides.ts`**

One `CREATE TABLE IF NOT EXISTS "release_overrides"` matching the entity's columns, `CREATE INDEX IF NOT EXISTS "idx_release_overrides_order_id" ON "release_overrides" ("orderId")`, following the exact style of `1720000009000-CustomersPeopleAndRefunds.ts`. `down()` drops the index then the table.

- [ ] **Step 5: Register the entity and migration in `apps/api/src/app.module.ts`**

Add `ReleaseOverride` to the `entities` array's import and array literal; import `ReleaseOverrides1720000015000` and append it to the Postgres branch's `migrations` array — same two edits every prior migration made.

- [ ] **Step 6: Change the gate in `apps/api/src/production-release.ts`**

Replace:
```ts
if (order.paymentStatus !== 'paid' && !['walk_in', 'salesperson'].includes(order.source)) throw new BadRequestException('Online orders must be paid before production release');
```
with: if `order.paymentStatus !== 'paid'`, then if `override?.reason` is present save a `ReleaseOverride` row (via `manager.getRepository(ReleaseOverride)`) and continue; otherwise throw `new BadRequestException('Payment must be recorded before production release')`. Add `override?: { reason: string }` as the function's fourth parameter. Include the override reason in the existing `ProductionJobActivity` "system" note (e.g. append `` (released unpaid: ${override.reason}) `` to the existing note text) so it shows in the job's activity log without a UI change there.

- [ ] **Step 7: Thread the parameter through `OrderService.releaseOrderToProduction` in `apps/api/src/order.service.ts`**

`async releaseOrderToProduction(orderId: string, actor = 'system', override?: { reason: string }) { const result = await this.orders.manager.transaction(manager => releaseProductionJobs(manager, orderId, actor, override)); ... }` — same body otherwise.

- [ ] **Step 8: Add `ReleaseOrderDto` to `apps/api/src/dto.ts`**

```ts
export class ReleaseOrderDto {
  @IsOptional() @IsString() @Length(10, 500) @Matches(/\S/) overrideReason?: string;
}
```

Add a case to the same test file asserting validation rejects a whitespace-only reason, using this project's existing `errorsFor(Dto, body)` helper pattern from `apps/api/test/amount-precision.test.cjs` (`plainToInstance` + `validateSync`):

```js
test('a release override reason of only spaces is rejected by validation', () => {
  const errors = validateSync(plainToInstance(ReleaseOrderDto, { overrideReason: '          ' }));
  assert.ok(errors.some(e => e.property === 'overrideReason'));
});
```

- [ ] **Step 9: Wire the controller in `apps/api/src/order.controller.ts`**

`@Post(':id/release') release(@Req() request: Request, @Param('id') id: string, @Body() dto: ReleaseOrderDto)`: keep the existing `jobs.release` permission check; if `dto.overrideReason` is given, additionally require `request.user!.permissions.includes('jobs.release_unpaid')` (throw `ForbiddenException('Permission to release an unpaid order is required')` otherwise), then call `this.orders.releaseOrderToProduction(id, request.user!.email, dto.overrideReason ? { reason: dto.overrideReason } : undefined)`.

- [ ] **Step 10: Run tests to verify they pass**

Same command as Step 2.
Expected: PASS

- [ ] **Step 11: Update the admin API client in `apps/admin/src/api.ts`**

`releaseOrder: <T>(id: string, overrideReason?: string) => request<T>(`/admin/orders/${id}/release`, { method: 'POST', body: JSON.stringify(overrideReason ? { overrideReason } : {}) })`.

- [ ] **Step 12: Add the override control in `apps/admin/src/main.tsx`**

The release button and its handler live in `App`'s `content=<Operations user={user} orders={orders} jobs={jobs} onRelease={async order=>{await api.releaseOrder(order.id);await load();notify('Production jobs released')}} .../>` and inside `Operations` itself, where `canRelease` gates a `<section className="surface ops-release">` listing releasable orders with a "Release jobs" button calling `onRelease(order)`, with `saveError` shown via `{saveError&&<div className="alert" role="alert">{saveError}</div>}`. Change `onRelease`'s signature to `(order: Order, overrideReason?: string) => Promise<void>`, and in `Operations`'s release button's `onClick`, catch the thrown `ApiError`; when its message is `'Payment must be recorded before production release'` and `user.permissions.includes('jobs.release_unpaid')`, switch that order's row into a small inline form (reason `<textarea>`, minLength 10, and a "Release anyway" button calling `onRelease(order, reason)`) instead of just setting `saveError`; otherwise set `saveError` as today.

- [ ] **Step 13: Typecheck both apps**

Run: `cd apps/api && npx tsc --noEmit` and `cd apps/admin && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 14: Commit**

```bash
git add apps/api/src/entities.ts apps/api/src/migrations/1720000015000-ReleaseOverrides.ts apps/api/src/app.module.ts apps/api/src/production-release.ts apps/api/src/order.service.ts apps/api/src/order.controller.ts apps/api/src/dto.ts apps/api/test/production-release.test.cjs apps/admin/src/api.ts apps/admin/src/main.tsx
git commit -m "api+admin: require payment before release for every order source, with a logged override"
```

---

## Task 3: WhatsApp receipt at order creation

**Files:**
- Modify: `apps/api/src/order.service.ts` (`createGuest`)
- Test: `apps/api/test/order-created-notifications.test.cjs`

**Interfaces:**
- Consumes: `NotificationService.queueWhatsApp(order: Order, template: string, payload: Record<string, unknown>)` — unchanged, existing.

- [ ] **Step 1: Write the failing test**

Using the same `OrderService` stub-constructor style as `production-visibility.test.cjs` (positional args, pass a stub `notifications` object as the eleventh constructor arg):

```js
test('order creation queues both an email and a WhatsApp receipt', async () => {
  const sent = [];
  const notifications = { queueEmail: async (...a) => sent.push(['email', ...a]), queueWhatsApp: async (...a) => sent.push(['whatsapp', ...a]) };
  // ...build a minimal createGuest fixture (orders/items/products/customers repos + transaction stub) reusing the pattern already proven in production-visibility.test.cjs...
  await service.createGuest({ customerName: 'Ama', customerEmail: 'a@b.com', customerPhone: '0244000000', items: [{ type: 'custom', name: 'Banner', quantity: 1, unitPricePesewas: 10000 }] }, 'walk_in');
  assert.deepEqual(sent.map(s => s[0]).sort(), ['email', 'whatsapp']);
});

test('order creation still calls queueWhatsApp with no customerPhone, and does not throw', async () => {
  // NotificationService.queueWhatsApp already no-ops on an empty phone (see notification.service.ts);
  // this guards against OrderService growing its own duplicate, divergent check around the call.
  const { service } = fixture({ notifications: { queueEmail: async () => {}, queueWhatsApp: async () => {} } });
  await assert.doesNotReject(service.createGuest({ customerName: 'Ama', customerEmail: 'a@b.com', customerPhone: '', items: [{ type: 'custom', name: 'Banner', quantity: 1, unitPricePesewas: 10000 }] }, 'walk_in'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build:packages && npm run build -w @vikipat/api && node --test apps/api/test/order-created-notifications.test.cjs`
Expected: FAIL — only `'email'` is in `sent`.

- [ ] **Step 3: Add the WhatsApp queue call in `createGuest`, `apps/api/src/order.service.ts`**

Immediately after the existing `await this.notifications.queueEmail(order,'order_created',{subject:...,text:...});` line, add `await this.notifications.queueWhatsApp(order,'order_created',{subject:..., text:...});` with the identical `subject`/`text` payload already built for the email call — do not duplicate the string construction, reuse the same local values.

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2.
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/order.service.ts apps/api/test/order-created-notifications.test.cjs
git commit -m "api: send a WhatsApp receipt on order creation, not just email"
```

---

## Task 4: Controls view shell in the admin app

**Files:**
- Modify: `apps/admin/src/main.tsx` (`type View`, `viewMeta`, `Sidebar`'s `nav` array, the view-switch chain)
- Create: `apps/admin/src/Controls.tsx`

**Interfaces:**
- Produces: `export default function Controls({ tab }: { tab?: string })` — a tabbed shell component (tabs: `Flags`, `Materials`, `Reconciliation`) with each tab body currently a placeholder `<Empty .../>` (reusing the existing `Empty` component from `main.tsx` — export it if not already exported, or re-declare a local copy following its exact prop shape `{ icon, title, copy }`). Later tasks replace each placeholder with real content; this task's job is only the shell, the nav entry, and the tab-switch mechanics (mirror `People.tsx`'s internal tab-button pattern exactly, including its CSS classes).
- Consumes: nothing new.

- [ ] **Step 1: Add `'controls'` to `type View` in `apps/admin/src/main.tsx`**

Add it to the union.

- [ ] **Step 2: Add a `viewMeta.controls` entry**

`controls: { label: 'Controls', description: 'Payment overrides, material reconciliation and review flags' }`.

- [ ] **Step 3: Add the nav entry in `Sidebar`'s `nav` array**

Insert `['controls', <ShieldAlert/>, 'Controls']` (import `ShieldAlert` from `lucide-react` alongside the other icon imports at the top of `main.tsx`) — place it near `'activity'`/`'settings'` in the array since it's an owner-review view, not a daily-operations one.

- [ ] **Step 4: Add the view-switch branch**

In the `if/else if` chain building `content`, add `else if(view==='controls')content=<Controls/>;` before the final `else content=<Overview .../>`.

- [ ] **Step 5: Write `apps/admin/src/Controls.tsx`**

A tabbed shell: local `useState` for the active tab (`'flags'|'materials'|'reconciliation'`), a row of tab buttons styled like `People.tsx`'s tab row, and a body that renders `<Empty icon={<ShieldAlert/>} title="Nothing here yet" copy="..."/>` per tab for now.

- [ ] **Step 6: Typecheck**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Manual check**

Run the admin app locally (`PATH=/usr/local/bin:$PATH npx vite` from `apps/admin`), sign in as the admin account, confirm "Controls" appears in the sidebar for the admin role and is absent for a non-admin staff login (reuses the existing `Sidebar`'s `nav.filter(([id])=>user.role==='admin'||id==='operations')` — no new code needed for this, just confirm it already works for the new entry).

- [ ] **Step 8: Commit**

```bash
git add apps/admin/src/main.tsx apps/admin/src/Controls.tsx
git commit -m "admin: add the Controls view shell (Flags/Materials/Reconciliation tabs, placeholders)"
```

---

## Task 5: Material items and stock tracking

**Files:**
- Create: `apps/api/src/migrations/1720000016000-MaterialItems.ts`
- Modify: `apps/api/src/entities.ts` (`MaterialItem`, `MaterialStockActivity`)
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/dto.ts` (`CreateMaterialItemDto`, `UpdateMaterialItemDto`, `AdjustMaterialStockDto` — copy `CreateProductDto`/`UpdateProductDto`/`AdjustStockDto` shapes, dropping fields that don't apply like `category`/`image`/`featured`, keeping `name`, `unit`, `stockQuantity` as a decimal, `lowStockThreshold`)
- Create: `apps/api/src/material.service.ts`
- Modify: `apps/api/src/controllers.ts` (new `MaterialController` under `admin/materials`, same guard stack as `AdminController`)
- Modify: `apps/api/src/app.module.ts` (register `MaterialService`, `MaterialController`)
- Modify: `apps/admin/src/api.ts` (`materials`, `createMaterial`, `updateMaterial`, `adjustMaterialStock`)
- Modify: `apps/admin/src/Controls.tsx` (real Materials tab)
- Test: `apps/api/test/material.test.cjs`

**Interfaces:**
- Produces: `MaterialItem { id, name, unit, stockQuantity: number, lowStockThreshold: number, createdAt, updatedAt }` — `stockQuantity`/`lowStockThreshold` as `@Column('decimal', {precision:12,scale:2,transformer:{...}})`, same transformer shape already used on `Product.price`.
- Produces: `MaterialStockActivity { id, materialItemId, materialName, previousQuantity, newQuantity, reason, actorEmail, createdAt }` — mirrors `StockActivity` field-for-field, renamed for materials.
- Produces: `MaterialService.list()`, `.create(dto, email)`, `.update(id, dto, email)`, `.adjust(id, dto, email)` — same method shapes as `AdminService`'s product methods, reused for the material entity.
- Consumes: nothing from earlier tasks except the Task 4 `Controls.tsx` shell (to fill its Materials tab).

- [ ] **Step 1: Write the failing test**

`apps/api/test/material.test.cjs`, same stub-repo style as other tests:

```js
test('adjusting material stock writes a stock activity row with the before/after quantities', async () => {
  const { service, state } = fixture();
  await service.adjust('m1', { stockQuantity: 40, reason: 'Physical count' }, 'owner@vikipat.com');
  assert.equal(state.material.stockQuantity, 40);
  assert.equal(state.activity[0].previousQuantity, 100);
  assert.equal(state.activity[0].newQuantity, 40);
  assert.equal(state.activity[0].reason, 'Physical count');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build:packages && npm run build -w @vikipat/api && node --test apps/api/test/material.test.cjs`
Expected: FAIL — `material.service` doesn't exist yet.

- [ ] **Step 3: Add `MaterialItem` and `MaterialStockActivity` to `apps/api/src/entities.ts`**

Field lists per Interfaces above; follow `Product`/`StockActivity`'s exact decorator style (`@PrimaryGeneratedColumn('uuid')`, `@CreateDateColumn()`, `@UpdateDateColumn()` on `MaterialItem` only — `MaterialStockActivity` only needs `@CreateDateColumn()`, matching `StockActivity`).

- [ ] **Step 4: Write `apps/api/src/migrations/1720000016000-MaterialItems.ts`**

Two `CREATE TABLE IF NOT EXISTS` statements (`material_items`, `material_stock_activity`), `stockQuantity`/`lowStockThreshold`/`previousQuantity`/`newQuantity` as `decimal(12,2) NOT NULL DEFAULT 0`, following the Postgres-DDL conventions used by every prior migration in this directory.

- [ ] **Step 5: Register entities and migration in `apps/api/src/app.module.ts`**

Same two edits as Task 2 Step 5.

- [ ] **Step 6: Add DTOs to `apps/api/src/dto.ts`**

`CreateMaterialItemDto { name: string (Length 2,120), unit: string (Length 1,40), stockQuantity: number (Min 0), lowStockThreshold: number (Min 0) }`; `UpdateMaterialItemDto` — same fields, all `@IsOptional()`; `AdjustMaterialStockDto { stockQuantity: number (Min 0), reason: string (Length 3,160) }` — mirror `AdjustStockDto`'s validators but allow decimals (`@IsNumber({maxDecimalPlaces:2})` instead of `@IsInt()`).

- [ ] **Step 7: Write `apps/api/src/material.service.ts`**

`MaterialService` with `list()`, `one(id)`, `create(dto, email)`, `update(id, dto, email)`, `adjust(id, dto, email)` — copy `AdminService`'s product methods' structure (including the `this.auth.audit(...)` calls, reusing the already-injected `AuthService`) and `recordStock`-equivalent private helper, operating on `MaterialItem`/`MaterialStockActivity` instead of `Product`/`StockActivity`. `list()` also exposes a `lowStock` boolean per item (`stockQuantity <= lowStockThreshold`) for Task 9's digest to reuse without recomputing the comparison elsewhere.

- [ ] **Step 8: Run test to verify it passes**

Same command as Step 2.
Expected: PASS

- [ ] **Step 9: Add `MaterialController` to `apps/api/src/controllers.ts`**

`@Controller('admin/materials') @UseGuards(AuthGuard,PasswordChangedGuard,CsrfGuard,AdminOnlyGuard)` with `GET`, `GET :id`, `POST`, `PATCH :id`, `POST :id/stock` — same route/verb shape as `AdminController`'s product routes, just under `admin/materials`.

- [ ] **Step 10: Register `MaterialService`/`MaterialController` in `apps/api/src/app.module.ts`**

Add to the module's `providers`/`controllers` arrays alongside `AdminService`/`AdminController`.

- [ ] **Step 11: Add admin API client calls in `apps/admin/src/api.ts`**

`materials: <T>() => request<T>('/admin/materials')`, `createMaterial`, `updateMaterial`, `adjustMaterialStock` — same call shape as the existing `products`/`createProduct`/`updateProduct`/`adjustStock` entries right above them.

- [ ] **Step 12: Build the Materials tab in `apps/admin/src/Controls.tsx`**

A `data-table` of materials (name, unit, stock quantity, low-stock badge when `lowStock`), an "Add material" form/modal (reuse `ProductModal`'s structural pattern from `main.tsx` at a smaller scale — name/unit/stockQuantity/lowStockThreshold fields only), and a stock-adjust action per row (reuse the existing `Inventory` view's adjust-stock interaction pattern if present — check `main.tsx`'s `Inventory`/stock-activity view before writing this from scratch).

- [ ] **Step 13: Typecheck both apps**

Run: `cd apps/api && npx tsc --noEmit` and `cd apps/admin && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 14: Commit**

```bash
git add apps/api/src/entities.ts apps/api/src/migrations/1720000016000-MaterialItems.ts apps/api/src/app.module.ts apps/api/src/dto.ts apps/api/src/material.service.ts apps/api/src/controllers.ts apps/api/test/material.test.cjs apps/admin/src/api.ts apps/admin/src/Controls.tsx
git commit -m "api+admin: track raw-material stock, separate from finished-goods products"
```

---

## Task 6: Per-job material consumption logging

**Files:**
- Create: `apps/api/src/migrations/1720000017000-MaterialConsumption.ts`
- Modify: `apps/api/src/entities.ts` (`MaterialConsumption`)
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/dto.ts` (`LogMaterialConsumptionDto { materialItemId: string; quantity: number; unit: string }`)
- Modify: `apps/api/src/material.service.ts` (`logConsumption`)
- Modify: `apps/api/src/order.controller.ts` (`POST admin/orders/production/jobs/:id/consumption`)
- Modify: `apps/admin/src/api.ts` (`logJobConsumption`)
- Modify: `apps/admin/src/main.tsx` (job detail panel: "Log material used" control)
- Test: `apps/api/test/material-consumption.test.cjs`

**Interfaces:**
- Produces: `MaterialConsumption { id, jobId, materialItemId, materialName, quantity, unit, recordedBy, createdAt }`.
- Produces: `MaterialService.logConsumption(jobId: string, dto: LogMaterialConsumptionDto, actor: string): Promise<MaterialConsumption>` — in one transaction, decrements the `MaterialItem.stockQuantity` by `dto.quantity` (rejecting if it would go negative, per Review Focus), writes a `MaterialStockActivity` row with `reason` set to the job's `jobNumber`, and saves the `MaterialConsumption` row.
- Consumes: `ProductionJob` (to resolve `jobNumber` for the stock-activity reason and to confirm the job exists) from `entities.ts`, unchanged.

- [ ] **Step 1: Write the failing tests**

```js
test('logging consumption decrements material stock and records why', async () => {
  const { service, state } = fixture({ materialStock: 50 });
  await service.logConsumption('job1', { materialItemId: 'm1', quantity: 12, unit: 'sq ft' }, 'operator@vikipat.com');
  assert.equal(state.material.stockQuantity, 38);
  assert.equal(state.consumption[0].quantity, 12);
  assert.equal(state.stockActivity[0].reason.includes(state.job.jobNumber), true);
});

test('logging more than the material has in stock is rejected, nothing written', async () => {
  const { service, state } = fixture({ materialStock: 5 });
  await assert.rejects(service.logConsumption('job1', { materialItemId: 'm1', quantity: 12, unit: 'sq ft' }, 'operator@vikipat.com'), /stock/i);
  assert.equal(state.material.stockQuantity, 5);
  assert.equal(state.consumption.length, 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run build:packages && npm run build -w @vikipat/api && node --test apps/api/test/material-consumption.test.cjs`
Expected: FAIL — `logConsumption` doesn't exist.

- [ ] **Step 3: Add `MaterialConsumption` to `apps/api/src/entities.ts`**

Field list per Interfaces above, `@Index() @Column() jobId!: string;` so Task 8's reconciliation query can look these up by job efficiently.

- [ ] **Step 4: Write `apps/api/src/migrations/1720000017000-MaterialConsumption.ts`**

One `CREATE TABLE IF NOT EXISTS "material_consumption"` plus `CREATE INDEX IF NOT EXISTS "idx_material_consumption_job_id" ON "material_consumption" ("jobId")`.

- [ ] **Step 5: Register entity and migration in `apps/api/src/app.module.ts`**

- [ ] **Step 6: Add `LogMaterialConsumptionDto` to `apps/api/src/dto.ts`**

`{ @IsUUID() materialItemId!: string; @IsNumber({maxDecimalPlaces:2}) @Min(0.01) @Max(1000000) quantity!: number; @IsString() @Length(1,20) unit!: string; }`

- [ ] **Step 7: Implement `MaterialService.logConsumption` in `apps/api/src/material.service.ts`**

Use a transaction (same `this.dataSource`/manager pattern as `PricingAdminService` or `OrderService`'s transactional methods — check which this service already has access to, inject `DataSource` if needed like `PricingAdminService` does). Load the `MaterialItem` and `ProductionJob` with a lock (reuse `lockedFindOne` from `./db`, same helper every other transactional write in this codebase uses); throw `BadRequestException` if `quantity > materialItem.stockQuantity`; otherwise decrement, save the `MaterialStockActivity` row with `reason: \`Job ${job.jobNumber}\``, save the `MaterialConsumption` row, return it.

- [ ] **Step 8: Run tests to verify they pass**

Same command as Step 2.
Expected: PASS

- [ ] **Step 9: Add the endpoint in `apps/api/src/order.controller.ts`**

`@Post('production/jobs/:id/consumption') logConsumption(@Req() request: Request, @Param('id') id: string, @Body() dto: LogMaterialConsumptionDto)`: gate on `request.user!.permissions.includes('jobs.note')` (same permission already gating the job note box, per the spec's UI decision), call `this.materials.logConsumption(id, dto, request.user!.email)` (inject `MaterialService` into this controller's constructor).

- [ ] **Step 10: Add `logJobConsumption` to `apps/admin/src/api.ts`**

`logJobConsumption: <T>(jobId: string, data: unknown) => request<T>(\`/admin/orders/production/jobs/${jobId}/consumption\`, { method: 'POST', body: JSON.stringify(data) })`.

- [ ] **Step 11: Add the "Log material used" control to the job detail panel in `apps/admin/src/main.tsx`**

Near the existing "Add production note" box (same `ops-detail` panel) — a small inline form: a material `<select>` (populated from a `materials` prop passed down from `App`, fetched via `api.materials()` alongside the other `load()` calls) and a quantity `<input type="number">`, submitting via `api.logJobConsumption`. Follow the existing note-box's local-state/submit pattern in the same component rather than introducing a new state-management approach.

- [ ] **Step 12: Typecheck both apps**

Run: `cd apps/api && npx tsc --noEmit` and `cd apps/admin && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 13: Commit**

```bash
git add apps/api/src/entities.ts apps/api/src/migrations/1720000017000-MaterialConsumption.ts apps/api/src/app.module.ts apps/api/src/dto.ts apps/api/src/material.service.ts apps/api/src/order.controller.ts apps/api/test/material-consumption.test.cjs apps/admin/src/api.ts apps/admin/src/main.tsx
git commit -m "api+admin: log material consumption per production job"
```

---

## Task 7: Review flags — custom-priced items, late cancellations/refunds, unattended jobs

**Files:**
- Modify: `apps/api/src/order.service.ts` (three new read methods)
- Modify: `apps/api/src/order.controller.ts` (three new `GET` routes under `admin/orders/flags`)
- Modify: `apps/admin/src/api.ts`
- Modify: `apps/admin/src/Controls.tsx` (real Flags tab)
- Test: `apps/api/test/review-flags.test.cjs`

**Interfaces:**
- Produces: `OrderService.flagCustomPricedItems(from?: string, to?: string): Promise<Array<{ orderId, orderNumber, customerName, name, quantity, unitPricePesewas, totalPesewas, createdAt }>>`.
- Produces: `OrderService.flagLateCancellations(from?: string, to?: string): Promise<Array<{ orderId, orderNumber, customerName, cancelledOrRefundedAt, reachedStage: OrderStatus, reachedAt }>>` — an order qualifies if it is currently `'cancelled'`, or has any `OrderRefund` row, **and** its `order_status_history` contains a row with `status` in `['ready_for_production','in_production','quality_check','ready','out_for_delivery','completed']` timestamped before the cancellation/refund.
- Produces: `OrderService.flagUnattendedJobs(date: string): Promise<Array<{ jobId, jobNumber, orderNumber, occurredAt, note }>>` — `ProductionJobActivity` rows of `type: 'stage_change'` on `date` where no `AttendanceRecord` (`clockIn <= occurredAt` and (`clockOut IS NULL` or `clockOut >= occurredAt`)) exists for any employee.
- Consumes: `OrderRefund`, `AttendanceRecord`, `OrderStatusHistory`, `ProductionJobActivity` entities, unchanged.

- [ ] **Step 1: Write the failing tests**

```js
test('an order cancelled before ever reaching production is not flagged', async () => {
  const { service } = fixture({ orderStatus: 'cancelled', history: [{ status: 'pending_review' }, { status: 'cancelled' }] });
  assert.deepEqual(await service.flagLateCancellations(), []);
});

test('an order cancelled after reaching in_production is flagged', async () => {
  const { service } = fixture({ orderStatus: 'cancelled', history: [{ status: 'paid' }, { status: 'in_production' }, { status: 'cancelled' }] });
  const flags = await service.flagLateCancellations();
  assert.equal(flags.length, 1);
  assert.equal(flags[0].reachedStage, 'in_production');
});

test('a stage-change activity with nobody clocked in is flagged as unattended', async () => {
  const { service } = fixture({ activity: [{ type: 'stage_change', createdAt: new Date('2026-10-30T10:00:00Z') }], attendance: [] });
  const flags = await service.flagUnattendedJobs('2026-10-30');
  assert.equal(flags.length, 1);
});

test('a stage-change activity during a clocked-in shift is not flagged', async () => {
  const { service } = fixture({
    activity: [{ type: 'stage_change', createdAt: new Date('2026-10-30T10:00:00Z') }],
    attendance: [{ clockIn: new Date('2026-10-30T08:00:00Z'), clockOut: null }],
  });
  assert.deepEqual(await service.flagUnattendedJobs('2026-10-30'), []);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run build:packages && npm run build -w @vikipat/api && node --test apps/api/test/review-flags.test.cjs`
Expected: FAIL — methods don't exist.

- [ ] **Step 3: Implement the three methods in `apps/api/src/order.service.ts`**

`flagCustomPricedItems`: query `OrderItem` where `kind='custom'`, join `Order` for `orderNumber`/`customerName`, optional `createdAt` range via the `Order`'s `createdAt` (note `OrderItem` itself has no timestamp column — join through `Order`). `flagLateCancellations`: for candidate orders (`status='cancelled'` OR has an `OrderRefund`), load their `order_status_history` ordered by `createdAt`, find the cancellation/refund timestamp and the latest "reached production" row before it; include only if such a row exists. `flagUnattendedJobs`: load the day's `stage_change` activity rows, load the day's `AttendanceRecord`s, filter in memory (the shop's daily volume is small — no need for a window-function query here, per YAGNI).

- [ ] **Step 4: Run tests to verify they pass**

Same command as Step 2.
Expected: PASS

- [ ] **Step 5: Add the three routes to `AdminOrderController` in `apps/api/src/order.controller.ts`**

```ts
@Get('flags/custom-priced') customPriced(@Query('from') from?: string, @Query('to') to?: string) { return this.orders.flagCustomPricedItems(from, to); }
@Get('flags/late-cancellations') lateCancellations(@Query('from') from?: string, @Query('to') to?: string) { return this.orders.flagLateCancellations(from, to); }
@Get('flags/unattended-jobs') unattendedJobs(@Query('date') date: string) { return this.orders.flagUnattendedJobs(date); }
```
(Add `@Query` and `Query` import from `@nestjs/common` if not already imported in this file.) These inherit the controller's existing `@UseGuards(AuthGuard,PasswordChangedGuard,CsrfGuard,OperationsGuard)` plus need `AdminOnlyGuard` like `list()` does — add `@UseGuards(AdminOnlyGuard)` to each, matching `list()`'s pattern.

- [ ] **Step 6: Add the three calls to `apps/admin/src/api.ts`**

`flagCustomPriced`, `flagLateCancellations`, `flagUnattendedJobs` — `GET` with query-string params, same `URLSearchParams` pattern already used by `api.attendance`/`api.performance`.

- [ ] **Step 7: Build the Flags tab in `apps/admin/src/Controls.tsx`**

Three `data-table`s (reuse the table markup pattern from `People.tsx`'s attendance table), each loaded on tab-mount via `useEffect`, with a date-range control for the first two and a date picker for the third (default both to "last 7 days" / "today").

- [ ] **Step 8: Typecheck both apps**

Run: `cd apps/api && npx tsc --noEmit` and `cd apps/admin && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/order.service.ts apps/api/src/order.controller.ts apps/api/test/review-flags.test.cjs apps/admin/src/api.ts apps/admin/src/Controls.tsx
git commit -m "api+admin: surface custom-priced items, late cancellations/refunds and unattended jobs for review"
```

---

## Task 8: Material/billed-area reconciliation report

**Files:**
- Modify: `apps/api/src/material.service.ts` (`reconciliation` method)
- Modify: `apps/api/src/controllers.ts` (`MaterialController`'s new `GET admin/materials/reconciliation` route)
- Modify: `apps/admin/src/api.ts`
- Modify: `apps/admin/src/Controls.tsx` (real Reconciliation tab)
- Test: `apps/api/test/material-reconciliation.test.cjs`

**Interfaces:**
- Produces: `MaterialService.reconciliation(from: string, to: string): Promise<{ billedByServiceCode: Array<{ serviceCode: string; serviceName: string; totalAreaSqFt: number }>; loggedByMaterial: Array<{ materialName: string; totalQuantity: number; unit: string }> }>` — two independent lists per the spec's decision not to auto-merge them into a single score.

- [ ] **Step 1: Write the failing test**

```js
test('reconciliation returns billed area by service code and logged consumption by material, unmerged', async () => {
  const { service } = fixture({
    jobs: [{ serviceCode: 'flexy-banner', title: 'Flexy / Banner', specification: JSON.stringify({ totalAreaSqFt: 40 }), createdAt: new Date('2026-10-20') }],
    consumption: [{ materialName: 'Flexy banner roll', quantity: 30, unit: 'sq ft', createdAt: new Date('2026-10-20') }],
  });
  const result = await service.reconciliation('2026-10-01', '2026-10-31');
  assert.deepEqual(result.billedByServiceCode, [{ serviceCode: 'flexy-banner', serviceName: 'Flexy / Banner', totalAreaSqFt: 40 }]);
  assert.deepEqual(result.loggedByMaterial, [{ materialName: 'Flexy banner roll', totalQuantity: 30, unit: 'sq ft' }]);
});

test('a service code or material with nothing in range returns an empty list, not an error', async () => {
  const { service } = fixture({ jobs: [], consumption: [] });
  const result = await service.reconciliation('2026-10-01', '2026-10-31');
  assert.deepEqual(result, { billedByServiceCode: [], loggedByMaterial: [] });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build:packages && npm run build -w @vikipat/api && node --test apps/api/test/material-reconciliation.test.cjs`
Expected: FAIL — method doesn't exist.

- [ ] **Step 3: Implement `MaterialService.reconciliation`**

Load `ProductionJob`s (inject `Repository<ProductionJob>` into `MaterialService`'s constructor) created in `[from, to]`, parse each `specification` JSON, sum `totalAreaSqFt` grouped by `serviceCode`/`title`. Load `MaterialConsumption` rows created in `[from, to]`, sum `quantity` grouped by `materialName`/`unit`. Return both lists, each sorted by total descending so the biggest numbers surface first.

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2.
Expected: PASS

- [ ] **Step 5: Add the route to `MaterialController` in `apps/api/src/controllers.ts`**

`@Get('reconciliation') reconciliation(@Query('from') from: string, @Query('to') to: string) { return this.materials.reconciliation(from, to); }`

- [ ] **Step 6: Add `materialReconciliation` to `apps/admin/src/api.ts`**

Same query-string pattern as Task 7 Step 6.

- [ ] **Step 7: Build the Reconciliation tab in `apps/admin/src/Controls.tsx`**

Two side-by-side `data-table`s (billed vs. logged), a shared date-range control, and a one-line caption stating these are independent numbers for the owner to compare, not an automatic match (per the spec's decision 3 — the UI copy must not imply a computed variance that doesn't exist).

- [ ] **Step 8: Typecheck both apps**

Run: `cd apps/api && npx tsc --noEmit` and `cd apps/admin && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/material.service.ts apps/api/src/controllers.ts apps/api/test/material-reconciliation.test.cjs apps/admin/src/api.ts apps/admin/src/Controls.tsx
git commit -m "api+admin: material/billed-area reconciliation report"
```

---

## Task 9: Owner daily digest

**Files:**
- Create: `apps/api/src/owner-digest.service.ts`
- Modify: `apps/api/src/order.service.ts` (`ordersCreatedOn`)
- Modify: `apps/api/src/app.module.ts` (register the service)
- Test: `apps/api/test/owner-digest.test.cjs`

**Interfaces:**
- Produces: `OwnerDigestService.buildDigest(forDate: string): Promise<{ subject: string; text: string }>` — a separate, directly-testable method from the `@Cron`-decorated method that calls it and emails it, following `PaymentReconciliationService`'s split between a cron entrypoint and a plain async method underneath.
- Produces (new, this task): `OrderService.ordersCreatedOn(date: string): Promise<{ count: number; bySource: Record<OrderSource, number> }>` — a small dedicated method (the existing `AnalyticsService` only exposes a multi-metric period report, not a single-day order count, so this is new rather than reused).
- Consumes: `MaterialService.list()` (for `lowStock` items, produced in Task 5), `OrderService.flagCustomPricedItems/flagLateCancellations/flagUnattendedJobs` (Task 7), `PaymentTransaction` repository (collected total for the day, filtered to `status==='paid'` and `paidAt` within the date), `MailService.send` (existing).

- [ ] **Step 1: Write the failing test**

```js
test('the digest names the date, totals, and every flag category that fired', async () => {
  const { service } = fixture({ ordersCreated: 3, collectedPesewas: 94000, customPriced: 1, lateCancellations: 0, unattendedJobs: 2, lowStockMaterials: ['Flexy banner roll'] });
  const digest = await service.buildDigest('2026-10-30');
  assert.match(digest.subject, /2026-10-30/);
  assert.match(digest.text, /3 orders/);
  assert.match(digest.text, /1 custom-priced/);
  assert.match(digest.text, /2 unattended/);
  assert.match(digest.text, /Flexy banner roll/);
});

test('a quiet day with nothing to flag still produces a digest, not an empty string', async () => {
  const { service } = fixture({ ordersCreated: 0, collectedPesewas: 0, customPriced: 0, lateCancellations: 0, unattendedJobs: 0, lowStockMaterials: [] });
  const digest = await service.buildDigest('2026-10-30');
  assert.ok(digest.text.length > 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run build:packages && npm run build -w @vikipat/api && node --test apps/api/test/owner-digest.test.cjs`
Expected: FAIL — service doesn't exist.

- [ ] **Step 3: Add `ordersCreatedOn` to `apps/api/src/order.service.ts`**

`async ordersCreatedOn(date: string) { const orders = await this.orders.createQueryBuilder('order').where("order.createdAt::date = :date", { date }).getMany(); return { count: orders.length, bySource: { online: 0, walk_in: 0, salesperson: 0, ...Object.fromEntries(['online','walk_in','salesperson'].map(s => [s, orders.filter(o => o.source === s).length])) } }; }` (the `::date` cast is Postgres-only, matching every other raw query already in this file and this project's SQLite-via-`synchronize`-only-in-dev convention — it is never evaluated against SQLite in practice since this service always runs against the real Postgres/SQLite pair the app is deployed with, consistent with how the rest of this file already writes Postgres-flavoured query-builder clauses).

- [ ] **Step 4: Implement `apps/api/src/owner-digest.service.ts`**

`@Injectable() export class OwnerDigestService { constructor(private orders: OrderService, private materials: MaterialService, @InjectRepository(PaymentTransaction) private payments: Repository<PaymentTransaction>, private mail: MailService) {} async buildDigest(forDate: string) {...} @Cron(CronExpression.EVERY_DAY_AT_7AM, { name: 'owner-daily-digest' }) async send() { const forDate = /* yesterday, YYYY-MM-DD, Accra = UTC so plain Date math is correct */; const digest = await this.buildDigest(forDate); await this.mail.send({ to: process.env.ADMIN_EMAIL || 'hello@vikipat.com', subject: digest.subject, text: digest.text, idempotencyKey: \`owner-digest-${forDate}\` }); } }`. Compose `text` as plain sentences (`"3 orders, GH₵940.00 collected."`, `"1 custom-priced item to review."`, `"2 unattended production stage changes."`, `"Low stock: Flexy banner roll."`) — always include every category's line even when its count is zero, so a quiet day reads as "0 flags" rather than a shorter, ambiguous message (ties to the second test).

- [ ] **Step 5: Run tests to verify they pass**

Same command as Step 2.
Expected: PASS

- [ ] **Step 6: Register `OwnerDigestService` in `apps/api/src/app.module.ts`**

Add to `providers`, alongside `PaymentReconciliationService`.

- [ ] **Step 7: Typecheck**

Run: `cd apps/api && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/owner-digest.service.ts apps/api/src/order.service.ts apps/api/src/app.module.ts apps/api/test/owner-digest.test.cjs
git commit -m "api: daily owner digest covering orders, collections and every review flag"
```

---

## After all tasks: whole-system check

Not a task of its own — run once the branch is otherwise done, before the final review:

- `npm run build:packages && npm run build -w @vikipat/api && node --test apps/api/test/*.test.cjs` (full existing suite, not just the new files, to catch any regression in `releaseProductionJobs`'s callers).
- Start the API locally against a fresh SQLite file (per the project's established local-dev recipe) and the admin app against it; sign in, create a walk-in order, attempt release unpaid (confirm the block), release with an override reason (confirm it logs), log material consumption against a released job, and open the new Controls view's three tabs to confirm each renders real data with no console errors — the same kind of manual pass already used earlier in this project for the Shades redesign and the mobile-login fix.
