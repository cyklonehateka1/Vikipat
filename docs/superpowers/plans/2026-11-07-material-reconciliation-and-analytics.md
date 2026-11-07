# Material Reconciliation and Owner Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin create print services and roll materials themselves, compute a roll job's material consumption automatically, anchor it to a periodic physical count with a per-material tolerance that flags a shortfall (never the word "theft"), and fold materials + every flag into the existing owner analytics view with day/week/month/year/all-time presets.

**Architecture:** Additive TypeORM entities/columns + Postgres migrations (SQLite dev uses `synchronize: true`, no migration needed there), new service methods following this codebase's established patterns (`this.X.manager.transaction(...)` for multi-row writes, `lockedFindOne` inside transactions, standalone exported functions — like `production-release.ts`'s `releaseProductionJobs` — for logic that must run inside a *caller's* transaction), new endpoints under the existing guard stacks, and admin UI additions to the existing `PricingStudio.tsx`, `Controls.tsx`, `main.tsx` (Product modal, Inventory), and `Analytics.tsx`.

**Tech Stack:** NestJS + TypeORM (Postgres prod, SQLite dev) on the API; React + Vite on the admin app. Tests: `node --test` against compiled `apps/api/dist`, stub-repository style (see `apps/api/test/material.test.cjs`, `material-consumption.test.cjs`, `material-reconciliation.test.cjs`).

**Spec:** `docs/superpowers/specs/2026-11-07-material-reconciliation-and-analytics-design.md`

## Global Constraints

- This branch forks from `internal-controls-system` (already has `MaterialItem`, `MaterialConsumption`, `MaterialStockActivity`, `MaterialService`, `Controls.tsx`'s Flags/Materials/Reconciliation tabs, `AnalyticsService.overview()`, `OwnerDigestService`), not from `main`.
- Migrations: `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`, `uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `timestamptz NOT NULL DEFAULT now()` — exact style of every migration in `apps/api/src/migrations/`. Register every new entity/migration in `apps/api/src/app.module.ts`'s `entities` and (Postgres-branch) `migrations` arrays.
- The system must never use the word "theft" anywhere — flag text states a percentage and a gap, nothing more (spec anti-goal).
- A physical count's `expectedQuantity`/`accountedForPercent` are computed once, at record time, and stored as columns — never recomputed on a later read (spec, settled during the prior design's builder-check).
- Automatic roll consumption fires when a `ProductionJob` transitions *into* `in_production`, not at release (spec).
- Money stays in pesewas; roll length is tracked in **metres**; existing area math stays in sq ft (spec).
- All new TypeScript must pass `npx tsc --noEmit` in both `apps/api` and `apps/admin` before a task is done.

## Review Focus

- A roll job whose width exceeds every available roll tier for its service code (or whose nearest-fitting tier has run out of stock) must not throw and must not silently draw a negative roll — it returns no consumption and the job proceeds unaffected; a test must assert `computeRollConsumption` returns `null` and leaves every `MaterialItem.stockQuantity` untouched in that case.
- A production job that *skips* `in_production` entirely in one update (e.g. a role allowed to jump stages, or a job already past it when this ships) must not silently lose its consumption — but also must not double-consume if the same job is later moved `in_production → blocked → in_production` again. A test must confirm a second entry into `in_production` for a job that already has a `MaterialConsumption` row does not draw the roll twice.
- Recording a physical count when `expectedQuantity` is zero or negative must not throw a division error — it's a data problem worth its own flag text, not a crash (spec, Review Focus from the prior plan carried forward since the same shape of bug is possible here too).
- Creating a print service with a code that collides with an existing `ServicePriceRule.code` must fail with a clear, catchable error (unique constraint plus a clean `BadRequestException`), not a raw database error reaching the admin UI.
- The owner dashboard's "All-time" preset must not break `AnalyticsService.overview()`'s existing 1–366-day validation — a shop older than a year needs a defined, honest behavior (capped at the method's own maximum, clearly labelled), not a thrown `BadRequestException` the UI doesn't expect.

---

## Task 1: Admin can create a new print service

**Files:**
- Modify: `apps/api/src/dto.ts` (`CreateServiceRuleDto`)
- Modify: `apps/api/src/pricing-admin.service.ts` (`create`)
- Modify: `apps/api/src/pricing-admin.controller.ts` (`POST admin/pricing/rules`)
- Modify: `apps/admin/src/api.ts` (`createPricingRule`)
- Modify: `apps/admin/src/PricingStudio.tsx` ("New service" form)
- Test: `apps/api/test/pricing-create.test.cjs`

**Interfaces:**
- Produces: `CreateServiceRuleDto { name: string; code?: string; employeeRatePesewas: number; marketerRatePesewas: number; walkInRatePesewas: number; onlineRatePesewas: number; designMinimumPesewas: number; roundingMode: 'nearest_cedi'|'up_to_cedi' }` — `code` optional; when omitted, slugified from `name` the same way `apps/admin/src/main.tsx`'s existing `slugify` pattern works (lowercase, non-alphanumeric → `-`), per the spec. (If no shared slugify helper exists server-side, write one private to `pricing-admin.service.ts` — it's a few lines, not worth a new shared module.)
- Produces: `PricingAdminService.create(dto: CreateServiceRuleDto, email: string): Promise<ServicePriceRule>` — creates the rule at `version: 1`, `calculator: 'large_format_area'`, `active: true`, `category: 'finish'` (safe default — the existing "Customer sizes"/copy editor already lets the admin change this after creation via the existing `updateCopy` endpoint, so this task doesn't need a category field), and writes its initial `ServicePriceRuleVersion` snapshot using the same shape `versionSnapshot` already builds. Throws `BadRequestException('A service with this code already exists')` on a code collision — check `this.rules.existsBy({code})` before insert, not just a raw unique-constraint failure.

- [ ] **Step 1: Write the failing test**

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { PricingAdminService } = require('../dist/pricing-admin.service');

function fixture({ existingCodes = [] } = {}) {
  const state = { rules: [], versions: [] };
  const rules = {
    existsBy: async ({ code }) => existingCodes.includes(code),
    create: (data) => ({ ...data }),
    save: async (r) => { const saved = { ...r, id: `rule${state.rules.length + 1}` }; state.rules.push(saved); return saved; },
  };
  const versions = { create: (data) => ({ ...data }), save: async (v) => { state.versions.push(v); return v; } };
  const service = new PricingAdminService(rules, null, versions, null);
  return { service, state };
}

test('creating a service sets version 1 and writes an initial version snapshot', async () => {
  const { service, state } = fixture();
  const rule = await service.create({ name: 'Polypropylene Paper', employeeRatePesewas: 200, marketerRatePesewas: 210, walkInRatePesewas: 220, onlineRatePesewas: 220, designMinimumPesewas: 10000, roundingMode: 'nearest_cedi' }, 'owner@vikipat.com');
  assert.equal(rule.version, 1);
  assert.equal(rule.code, 'polypropylene-paper');
  assert.equal(state.versions[0].code, 'polypropylene-paper');
});

test('a colliding code is rejected before any write', async () => {
  const { service, state } = fixture({ existingCodes: ['flexy-banner'] });
  await assert.rejects(service.create({ name: 'Flexy', code: 'flexy-banner', employeeRatePesewas: 200, marketerRatePesewas: 200, walkInRatePesewas: 200, onlineRatePesewas: 200, designMinimumPesewas: 10000, roundingMode: 'nearest_cedi' }, 'owner@vikipat.com'), /already exists/);
  assert.equal(state.rules.length, 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run build:packages && npm run build -w @vikipat/api && node --test apps/api/test/pricing-create.test.cjs`
Expected: FAIL — `create` doesn't exist.

- [ ] **Step 3: Add `CreateServiceRuleDto` to `apps/api/src/dto.ts`**

Fields and validators per the Interfaces block; rates/design-minimum use the same `@IsInt() @Min(0) @Max(100000000)` shape already used by `SavePricingDraftDto`'s rate fields (check that DTO for the exact decorators to mirror).

- [ ] **Step 4: Implement `PricingAdminService.create`**

Use the existing `versionSnapshot(rule, actor)` private method unchanged — call it after the rule is saved with its real `id`. Audit via the existing private `audit()` helper, action `'create'`, entity `'service_price_rule'`.

- [ ] **Step 5: Run tests to verify they pass**

Same command as Step 2.
Expected: PASS

- [ ] **Step 6: Add the route in `apps/api/src/pricing-admin.controller.ts`**

`@Post('rules') create(@Req() req: Request, @Body() dto: CreateServiceRuleDto) { return this.pricing.create(dto, req.user!.email); }` — inherits the controller's existing class-level `AdminOnlyGuard`.

- [ ] **Step 7: Add `createPricingRule` to `apps/admin/src/api.ts`**

Same call shape as the existing `savePricingDraft`/`publishPricingDraft` entries right above it: `createPricingRule: <T>(data: unknown) => request<T>('/admin/pricing/rules', { method: 'POST', body: JSON.stringify(data) })`.

- [ ] **Step 8: Add the "New service" form to `apps/admin/src/PricingStudio.tsx`**

A small toggled form above the `pricing-index` list (same `Plus` icon/toggle pattern `Controls.tsx`'s `MaterialsTab` already uses for "Add material"): name, four rates, design minimum, rounding mode. On submit, call `api.createPricingRule`, then `onReload()` and select the new rule (match it by the name just submitted, or have the create response return the new rule and select by its `id`).

- [ ] **Step 9: Typecheck both apps**

Run: `cd apps/api && npx tsc --noEmit` and `cd apps/admin && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/dto.ts apps/api/src/pricing-admin.service.ts apps/api/src/pricing-admin.controller.ts apps/api/test/pricing-create.test.cjs apps/admin/src/api.ts apps/admin/src/PricingStudio.tsx
git commit -m "api+admin: admin can create a new print service, not just edit existing ones"
```

---

## Task 2: `MaterialItem` gains a roll shape

**Files:**
- Create: `apps/api/src/migrations/1720000018000-MaterialItemRoll.ts`
- Modify: `apps/api/src/entities.ts` (`MaterialItem`)
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/dto.ts` (`CreateMaterialItemDto`, `UpdateMaterialItemDto`)
- Modify: `apps/api/src/material.service.ts` (`create`, `update` — unit conversion)
- Modify: `apps/admin/src/Controls.tsx` (`MaterialsTab` gains roll fields)
- Test: `apps/api/test/material.test.cjs` (extend)

**Interfaces:**
- Produces: `MaterialItem` gains `kind: 'roll' | 'count'` (`@Column({default:'count'})`, so every existing row defaults to `'count'` and nothing breaks), `rollWidthMetres: number | null` (same decimal-with-transformer shape already used for `stockQuantity`), `serviceCode: string | null` (`@Column({type:'varchar',nullable:true})`).
- Produces: `CreateMaterialItemDto` gains `kind?: 'roll'|'count'` (default `'count'` if omitted — validate `@IsOptional() @IsIn(['roll','count'])`), and, required only when `kind==='roll'`: `rollWidthValue: number`, `rollWidthUnit: 'ft'|'in'|'cm'`, `serviceCode: string`. Validate with `@ValidateIf(o=>o.kind==='roll')` the same way `OrderLineItemDto` already conditions large-format-only fields on `type==='large_format'`.
- Produces: `MaterialService.create`/`update` convert `rollWidthValue`+`rollWidthUnit` to `rollWidthMetres` before saving (`ft`: `×0.3048`; `in`: `×0.0254`; `cm`: `×0.01`) — the stored column is always metres, matching the spec.
- Consumes: nothing from Task 1.

- [ ] **Step 1: Write the failing test**

Add to `apps/api/test/material.test.cjs` (reuse its existing `fixture()` — check whether it needs a `serviceCode`/`rollWidthMetres` default added to the stub's `state.material` object; if so, add them there, not as a second fixture function):

```js
test('creating a roll material converts width to metres regardless of the unit entered', async () => {
  const { service, state } = fixture();
  await service.create({ name: 'Flexy/Banner 5ft', unit: 'm', stockQuantity: 50, lowStockThreshold: 10, kind: 'roll', rollWidthValue: 5, rollWidthUnit: 'ft', serviceCode: 'flexy-banner' }, 'owner@vikipat.com');
  assert.ok(Math.abs(state.material.rollWidthMetres - 1.524) < 0.001);
  assert.equal(state.material.serviceCode, 'flexy-banner');
});

test('a count material (no roll fields) still creates exactly as before', async () => {
  const { service, state } = fixture();
  await service.create({ name: 'Lamination film', unit: 'roll', stockQuantity: 10, lowStockThreshold: 2 }, 'owner@vikipat.com');
  assert.equal(state.material.kind, 'count');
  assert.equal(state.material.rollWidthMetres, null);
});
```

(Check `material.test.cjs`'s current `fixture()` — its stub `materials.save`/`materials.create` must round-trip whatever extra fields `create()` now passes, same as it already does for `name`/`unit`/`stockQuantity`. No change needed there if it already spreads the input object.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run build:packages && npm run build -w @vikipat/api && node --test apps/api/test/material.test.cjs`
Expected: FAIL — `rollWidthMetres` undefined on the saved material.

- [ ] **Step 3: Add the three columns to `MaterialItem` in `apps/api/src/entities.ts`**

- [ ] **Step 4: Write `apps/api/src/migrations/1720000018000-MaterialItemRoll.ts`**

Three `ALTER TABLE "material_items" ADD COLUMN IF NOT EXISTS` statements, matching `1720000012000-MaterialSizeLimits.ts`'s style for adding columns to an existing table.

- [ ] **Step 5: Register the migration in `apps/api/src/app.module.ts`**

- [ ] **Step 6: Extend `CreateMaterialItemDto`/`UpdateMaterialItemDto` in `apps/api/src/dto.ts`**

- [ ] **Step 7: Implement the unit conversion in `MaterialService.create`**

A private helper `rollWidthMetresFrom(value: number, unit: 'ft'|'in'|'cm'): number` (ft→×0.3048, in→×0.0254, cm→×0.01) used by both `create` and `update` when `dto.kind==='roll'`/roll fields are present.

- [ ] **Step 8: Run tests to verify they pass**

Same command as Step 2.
Expected: PASS

- [ ] **Step 9: Add roll fields to the "Add material" form in `apps/admin/src/Controls.tsx`'s `MaterialsTab`**

A `kind` select (Roll / Count); when `kind==='roll'`, show width value + unit (ft/in/cm) and a service-code select populated from the pricing rules list (fetch via `api.pricingRules()`, matching how other admin views already source the rule list — check `OrdersWorkspace.tsx`'s `rules` prop for the existing call shape to reuse, not reinvent).

- [ ] **Step 10: Typecheck both apps**

Run: `cd apps/api && npx tsc --noEmit` and `cd apps/admin && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add apps/api/src/entities.ts apps/api/src/migrations/1720000018000-MaterialItemRoll.ts apps/api/src/app.module.ts apps/api/src/dto.ts apps/api/src/material.service.ts apps/api/test/material.test.cjs apps/admin/src/Controls.tsx
git commit -m "api+admin: materials can be a specific roll width, feeding a print service"
```

---

## Task 3: `tolerancePercent` on `MaterialItem` and `Product`

**Files:**
- Create: `apps/api/src/migrations/1720000019000-TolerancePercent.ts`
- Modify: `apps/api/src/entities.ts` (`MaterialItem`, `Product`)
- Modify: `apps/api/src/dto.ts` (`CreateMaterialItemDto`, `UpdateMaterialItemDto`, `CreateProductDto`, `UpdateProductDto`)
- Modify: `apps/admin/src/Controls.tsx` (materials form), `apps/admin/src/main.tsx` (`ProductModal`)
- Test: `apps/api/test/material.test.cjs`, a new `apps/api/test/tolerance-default.test.cjs`

**Interfaces:**
- Produces: `tolerancePercent: number` on both entities (`@Column('decimal',{precision:5,scale:2,default:90})` on `MaterialItem` — **default 90, the spec's roll starting point**; `@Column('decimal',{precision:5,scale:2,default:98})` on `Product` — **default 98, the spec's sheet starting point**). Both use the same decimal-with-transformer shape as `stockQuantity`.
- Produces: `tolerancePercent?: number` added to `CreateMaterialItemDto`/`UpdateMaterialItemDto` (`@IsOptional() @IsNumber({maxDecimalPlaces:2}) @Min(0) @Max(100)`) and the equivalent on `CreateProductDto`/`UpdateProductDto`.

- [ ] **Step 1: Write the failing test**

```js
test('a new material defaults to 90% tolerance when none is given', async () => {
  const { service, state } = fixture();
  await service.create({ name: 'Flexy/Banner 5ft', unit: 'm', stockQuantity: 50, lowStockThreshold: 10 }, 'owner@vikipat.com');
  assert.equal(state.material.tolerancePercent, 90);
});

test('an explicit tolerance overrides the default', async () => {
  const { service, state } = fixture();
  await service.create({ name: 'Flexy/Banner 5ft', unit: 'm', stockQuantity: 50, lowStockThreshold: 10, tolerancePercent: 95 }, 'owner@vikipat.com');
  assert.equal(state.material.tolerancePercent, 95);
});
```

Note: this fixture-level test can only confirm the DTO/service pass the value through — the *default value itself* (90/98) lives in the `@Column` decorator and is a TypeORM/database-level default, not something a stub-repo unit test can observe (the stub's `create`/`save` just echo whatever object they're given). Confirm the actual default empirically in Step 9's manual check against a real SQLite instance, not by inventing a fake assertion here.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run build:packages && npm run build -w @vikipat/api && node --test apps/api/test/material.test.cjs`
Expected: FAIL — `tolerancePercent` undefined.

- [ ] **Step 3: Add the column to `MaterialItem` and `Product` in `apps/api/src/entities.ts`**

- [ ] **Step 4: Write `apps/api/src/migrations/1720000019000-TolerancePercent.ts`**

`ALTER TABLE "material_items" ADD COLUMN IF NOT EXISTS "tolerancePercent" decimal(5,2) NOT NULL DEFAULT 90` and `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "tolerancePercent" decimal(5,2) NOT NULL DEFAULT 98`.

- [ ] **Step 5: Register the migration in `apps/api/src/app.module.ts`**

- [ ] **Step 6: Extend the four DTOs in `apps/api/src/dto.ts`**

- [ ] **Step 7: Run tests to verify they pass**

Same command as Step 2.
Expected: PASS

- [ ] **Step 8: Add a tolerance field to `Controls.tsx`'s material form and `main.tsx`'s `ProductModal`**

A labelled number input ("Accounted-for tolerance, %") alongside the existing fields in each form — `ProductModal`'s existing field list (name/category/price/stock/etc.) is the pattern to match exactly.

- [ ] **Step 9: Manual check — confirm the real default**

Run the API locally against a fresh SQLite file (per this project's established local-dev recipe — `DATABASE_DRIVER=sqlite`), create a material with no `tolerancePercent` in the request body via `curl`, and confirm the stored row reads `90`. Same for a product, expecting `98`.

- [ ] **Step 10: Typecheck both apps**

Run: `cd apps/api && npx tsc --noEmit` and `cd apps/admin && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add apps/api/src/entities.ts apps/api/src/migrations/1720000019000-TolerancePercent.ts apps/api/src/app.module.ts apps/api/src/dto.ts apps/api/test/material.test.cjs apps/admin/src/Controls.tsx apps/admin/src/main.tsx
git commit -m "api+admin: configurable accounted-for tolerance on materials and products"
```

---

## Task 4: Automatic roll-length consumption at `in_production`

**Files:**
- Create: `apps/api/src/roll-consumption.ts`
- Modify: `apps/api/src/order.service.ts` (`updateProductionJob`)
- Test: `apps/api/test/roll-consumption.test.cjs`

**Interfaces:**
- Produces: `computeRollConsumption(manager: EntityManager, job: ProductionJob, actor: string): Promise<MaterialConsumption | null>` — standalone exported function, same shape as `production-release.ts`'s `releaseProductionJobs`, so it can run inside a caller's own transaction. Returns `null` (no throw) when the job has no usable width/height/area, no roll of its `serviceCode` exists, or no roll of any fitting width has enough stock.
- Consumes: `MaterialItem` (Task 2's roll fields), `MaterialConsumption`, `MaterialStockActivity`, `lockedFindOne` from `./db` — all already exist.

- [ ] **Step 1: Write the failing tests**

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { computeRollConsumption } = require('../dist/roll-consumption');
const { MaterialItem, MaterialConsumption, MaterialStockActivity } = require('../dist/entities');

function fixture({ rolls = [] } = {}) {
  const state = { rolls: rolls.map((r, i) => ({ id: `m${i + 1}`, ...r })), consumption: [], stockActivity: [] };
  const manager = {
    connection: { options: { type: 'sqlite' } },
    getRepository: (entity) => {
      if (entity === MaterialItem) return {
        find: async ({ where }) => state.rolls.filter((r) => r.kind === where.kind && r.serviceCode === where.serviceCode),
        save: async (r) => { const i = state.rolls.findIndex((x) => x.id === r.id); state.rolls[i] = r; return r; },
      };
      if (entity === MaterialConsumption) return { create: (d) => ({ ...d }), save: async (d) => { state.consumption.push(d); return d; } };
      if (entity === MaterialStockActivity) return { create: (d) => ({ ...d }), save: async (d) => { state.stockActivity.push(d); return d; } };
    },
  };
  return { manager, state };
}
const job = (overrides) => ({ id: 'job1', jobNumber: 'VP-TEST-J01', serviceCode: 'flexy-banner', specification: JSON.stringify({ width: 6, height: 3, unit: 'ft', totalAreaSqFt: 18 }), ...overrides });

test('draws the smallest roll width that fits and has stock, length computed from area', async () => {
  const { manager, state } = fixture({ rolls: [
    { kind: 'roll', serviceCode: 'flexy-banner', name: 'Flexy 5ft', rollWidthMetres: 1.524, stockQuantity: 50 },
    { kind: 'roll', serviceCode: 'flexy-banner', name: 'Flexy 7ft', rollWidthMetres: 2.1336, stockQuantity: 50 },
  ] });
  const result = await computeRollConsumption(manager, job(), 'operator@vikipat.com');
  assert.ok(result);
  assert.equal(state.rolls[0].name, 'Flexy 5ft'); // the 5ft roll was drawn, not the 7ft
  assert.ok(state.rolls[0].stockQuantity < 50);
});

test('falls back to the next wider roll when the right-sized one has run out', async () => {
  const { manager, state } = fixture({ rolls: [
    { kind: 'roll', serviceCode: 'flexy-banner', name: 'Flexy 5ft', rollWidthMetres: 1.524, stockQuantity: 0.1 },
    { kind: 'roll', serviceCode: 'flexy-banner', name: 'Flexy 7ft', rollWidthMetres: 2.1336, stockQuantity: 50 },
  ] });
  await computeRollConsumption(manager, job(), 'operator@vikipat.com');
  assert.equal(state.rolls[0].stockQuantity, 0.1); // untouched
  assert.ok(state.rolls[1].stockQuantity < 50); // the 7ft roll was drawn instead
});

test('no roll wide enough, or none with enough stock anywhere, returns null and touches nothing', async () => {
  const { manager, state } = fixture({ rolls: [{ kind: 'roll', serviceCode: 'flexy-banner', name: 'Flexy 5ft', rollWidthMetres: 1.524, stockQuantity: 0 }] });
  const result = await computeRollConsumption(manager, job(), 'operator@vikipat.com');
  assert.equal(result, null);
  assert.equal(state.consumption.length, 0);
  assert.equal(state.rolls[0].stockQuantity, 0);
});

test('a job with no dimensions on its specification returns null', async () => {
  const { manager } = fixture({ rolls: [{ kind: 'roll', serviceCode: 'flexy-banner', rollWidthMetres: 1.524, stockQuantity: 50 }] });
  const result = await computeRollConsumption(manager, job({ specification: '{}' }), 'operator@vikipat.com');
  assert.equal(result, null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run build:packages && npm run build -w @vikipat/api && node --test apps/api/test/roll-consumption.test.cjs`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `apps/api/src/roll-consumption.ts`**

Per the spec's exact algorithm: parse `job.specification`; if `width`/`height`/`totalAreaSqFt` aren't all present and positive, return `null`. Convert `width`/`height` to feet (`unit==='in'` → `/12`, else unchanged), take the **smaller** of the two, convert to metres (`×0.3048`) as `acrossRollMetres`. Load `MaterialItem` rows where `kind:'roll'` and `serviceCode: job.serviceCode`, sorted ascending by `rollWidthMetres`. For each candidate with `rollWidthMetres >= acrossRollMetres`, compute `lengthMetres = totalAreaSqFt / (rollWidthMetres / 0.3048) * 0.3048`; take the first (narrowest) candidate whose `stockQuantity >= lengthMetres`. If none qualifies, return `null`. Otherwise decrement that roll's `stockQuantity`, write a `MaterialStockActivity` row (`reason: \`Job ${job.jobNumber}\``, matching `MaterialService.logConsumption`'s existing reason format exactly) and a `MaterialConsumption` row (`recordedBy: actor`, `unit: 'm'`), all via `manager.getRepository(...)` so it's part of the caller's transaction — return the saved `MaterialConsumption`.

- [ ] **Step 4: Run tests to verify they pass**

Same command as Step 2.
Expected: PASS

- [ ] **Step 5: Write the no-double-consumption test**

```js
test('a job already carrying a consumption row is not drawn from again on a second in_production entry', async () => {
  // Build this against OrderService.updateProductionJob directly (reuse the stub-manager
  // style from production-visibility.test.cjs), with a fixture job whose ProductionJob repo
  // stub tracks stage history and a MaterialConsumption repo stub that already has one row
  // for this jobId before the second transition runs.
});
```

Decide the guard inside `updateProductionJob`'s wiring (Step 6) by checking for an existing `MaterialConsumption` row for the job before calling `computeRollConsumption` — write this test against that real check, not a placeholder.

- [ ] **Step 6: Wire the trigger into `apps/api/src/order.service.ts`'s `updateProductionJob`**

Inside the existing transaction, right after `await jobs.save(job);`: when `stageChanged && dto.stage==='in_production'`, check `await manager.getRepository(MaterialConsumption).existsBy({jobId:job.id})` — only call `computeRollConsumption(manager, job, actor)` if that's `false`. Import `computeRollConsumption` and `MaterialConsumption` at the top of the file.

- [ ] **Step 7: Run the no-double-consumption test and the rest of `review-flags.test.cjs`/`production-visibility.test.cjs` to verify they pass**

Run: `node --test apps/api/test/roll-consumption.test.cjs apps/api/test/review-flags.test.cjs`
Expected: PASS. (`production-visibility.test.cjs` is excluded — it's in the pre-existing, unrelated-failure set documented in the prior plan's ledger; don't expect it green.)

- [ ] **Step 8: Typecheck**

Run: `cd apps/api && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/roll-consumption.ts apps/api/src/order.service.ts apps/api/test/roll-consumption.test.cjs
git commit -m "api: compute roll-length consumption automatically when a job enters production"
```

---

## Task 5: Physical counts — `MaterialPhysicalCount`, recording, and the shortfall flag

**Files:**
- Create: `apps/api/src/migrations/1720000020000-MaterialPhysicalCount.ts`
- Modify: `apps/api/src/entities.ts` (`MaterialPhysicalCount`)
- Modify: `apps/api/src/dto.ts` (`RecordPhysicalCountDto`)
- Modify: `apps/api/src/material.service.ts` (`recordPhysicalCount`, `flagShortfalls` — handles both `MaterialItem` and `Product` targets; no changes needed to `admin.service.ts`)
- Modify: `apps/api/src/controllers.ts` (`MaterialController` gains the material-count route; `AdminController` gains the product-count route and a new `MaterialService` constructor dependency)
- Test: `apps/api/test/material-physical-count.test.cjs`

**Interfaces:**
- Produces: `MaterialPhysicalCount { id, targetKind: 'material_item'|'product', targetId, targetName, measuredQuantity, expectedQuantity, accountedForPercent: number|null, toleranceAtRecordPercent, recordedBy, recordedAt, note }`. `toleranceAtRecordPercent` is the target's `tolerancePercent` copied in at record time — **declared here, not invented later** — so `flagShortfalls` (below) can compare a count's own frozen percentage against its own frozen tolerance forever, with no re-read of the target and no way for a later tolerance edit to change what a past count shows. `targetName` is copied in the same way (the material/product's `name`), so a flag still reads sensibly if the target is later renamed or removed — same reasoning `MaterialConsumption.materialName` already uses elsewhere in this codebase.
- Produces: `MaterialService.recordPhysicalCount(targetKind: 'material_item'|'product', targetId: string, measuredQuantity: number, actor: string, note?: string): Promise<MaterialPhysicalCount>` — **simplification from the spec's literal "replay consumption/restocks since the previous count," settled here**: `MaterialItem.stockQuantity`/`Product.stock` are already continuously-maintained running totals (every consumption, adjustment and restock already updates them directly), so `expectedQuantity` is simply the target's *current* `stockQuantity`/`stock` at the moment the count is recorded — there's no need to separately replay history, and doing so would risk drifting from the one number the rest of the system already trusts. This still satisfies the spec's actual requirement (a stored, frozen-at-record-time comparison against ground truth) with less surface area. Guards `expectedQuantity <= 0` (returns `accountedForPercent: null` rather than dividing by zero/negative). After computing, sets the target's `stockQuantity`/`stock` to `measuredQuantity` (ground truth wins, per spec) in the same transaction.
- Produces: `MaterialService.flagShortfalls(from: string, to: string): Promise<Array<{ targetKind, targetId, targetName, accountedForPercent, measuredQuantity, expectedQuantity, recordedBy, recordedAt }>>` — every `MaterialPhysicalCount` in range whose `accountedForPercent` is not null and is below its own `toleranceAtRecordPercent`, both read straight off the row, nothing recomputed. The flag text is built in the admin UI from these fields, not pre-baked server-side as one string — matches how the three existing flag endpoints return structured rows for the UI to render, not pre-formatted sentences.
- Consumes/Produces (constructor): `MaterialService`'s constructor currently ends at `@InjectRepository(MaterialConsumption) private consumption: Repository<MaterialConsumption>` (5th parameter). This task appends exactly two more, in this order: `@InjectRepository(Product) private products: Repository<Product>` (6th), then `@InjectRepository(MaterialPhysicalCount) private counts: Repository<MaterialPhysicalCount>` (7th). Every test fixture in this task constructs `new MaterialService(materials, stocks, auth, jobs, consumption, products, counts)` — 7 positional arguments, `null` for whichever aren't exercised by that test.

- [ ] **Step 1: Write the failing tests**

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { MaterialService } = require('../dist/material.service');

function countFixture({ stockQuantity = 50, tolerancePercent = 90 } = {}) {
  const state = { material: { id: 'm1', name: 'Flexy/Banner 5ft', stockQuantity, tolerancePercent }, counts: [] };
  const materials = { findOneBy: async () => state.material, save: async (m) => { state.material = { ...state.material, ...m }; return state.material; } };
  const counts = { create: (d) => ({ ...d }), save: async (d) => { state.counts.push(d); return d; } };
  const service = new MaterialService(materials, null, null, null, null, null, counts);
  return { service, state };
}

test('a count below tolerance is stored with its accounted-for percent, and resets the stock to what was measured', async () => {
  const { service, state } = countFixture({ stockQuantity: 50, tolerancePercent: 90 });
  const record = await service.recordPhysicalCount('material_item', 'm1', 40, 'owner@vikipat.com');
  assert.equal(record.expectedQuantity, 50);
  assert.equal(record.accountedForPercent, 80);
  assert.equal(state.material.stockQuantity, 40);
});

test('a count at or above tolerance is still stored, just not a shortfall', async () => {
  const { service } = countFixture({ stockQuantity: 50, tolerancePercent: 90 });
  const record = await service.recordPhysicalCount('material_item', 'm1', 47, 'owner@vikipat.com');
  assert.equal(record.accountedForPercent, 94);
});

test('an expected quantity of zero does not throw, and reports no percentage', async () => {
  const { service } = countFixture({ stockQuantity: 0 });
  const record = await service.recordPhysicalCount('material_item', 'm1', 5, 'owner@vikipat.com');
  assert.equal(record.accountedForPercent, null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run build:packages && npm run build -w @vikipat/api && node --test apps/api/test/material-physical-count.test.cjs`
Expected: FAIL — `recordPhysicalCount` doesn't exist, and `MaterialService`'s constructor doesn't yet take a `counts` repository.

- [ ] **Step 3: Add `MaterialPhysicalCount` to `apps/api/src/entities.ts`**

Field list per Interfaces; `targetKind`/`targetId` as plain columns (no foreign key — it's polymorphic, same reasoning `AuditLog.entityId` already uses for a loosely-typed reference in this codebase). `accountedForPercent` nullable (`decimal` with the same transformer shape, `nullable: true`).

- [ ] **Step 4: Write `apps/api/src/migrations/1720000020000-MaterialPhysicalCount.ts`**

One `CREATE TABLE IF NOT EXISTS "material_physical_counts"` plus `CREATE INDEX IF NOT EXISTS "idx_material_physical_counts_target" ON "material_physical_counts" ("targetKind", "targetId")`.

- [ ] **Step 5: Register entity and migration in `apps/api/src/app.module.ts`**

- [ ] **Step 6: Add `RecordPhysicalCountDto` to `apps/api/src/dto.ts`**

`{ @IsNumber({maxDecimalPlaces:2}) @Min(0) @Max(1000000) measuredQuantity!: number; @IsOptional() @IsString() @Length(0,500) note?: string; }` (`targetKind`/`targetId` come from the route, not the body — see Step 9).

- [ ] **Step 7: Implement `MaterialService.recordPhysicalCount` and `flagShortfalls`**

Add the two new constructor parameters per the Interfaces block (`products` 6th, `counts` 7th). `recordPhysicalCount` loads the target (`this.materials.findOneBy({id})` for `'material_item'`, `this.products.findOneBy({id})` for `'product'`), computes `expectedQuantity` from its current `stockQuantity`/`stock`, computes `accountedForPercent` (guarded), copies the target's current `tolerancePercent` into the new row's `toleranceAtRecordPercent` and its `name` into `targetName`, saves the count row, then updates the target's stock to `measuredQuantity`, all in one `this.materials.manager.transaction(...)` (same pattern as `logConsumption`). `flagShortfalls(from, to)` queries `this.counts.find({where:{recordedAt: Between(...)}})` (reuse the existing `validDate` helper for `from`/`to`) and filters to rows where `accountedForPercent !== null && accountedForPercent < toleranceAtRecordPercent` — both read straight off the row, no re-read of the target.

- [ ] **Step 8: Run tests to verify they pass**

Same command as Step 2.
Expected: PASS

- [ ] **Step 9: Add the routes**

In `apps/api/src/controllers.ts`'s `MaterialController`: `@Post(':id/count') @UseGuards(AdminOnlyGuard) recordCount(@Req() req: Request, @Param('id') id: string, @Body() dto: RecordPhysicalCountDto) { return this.materials.recordPhysicalCount('material_item', id, dto.measuredQuantity, req.user!.email, dto.note); }`. For products, add the equivalent route to `AdminController` (same file): `@Post('products/:id/count') @UseGuards(AdminOnlyGuard) recordProductCount(...)` calling the same `MaterialService.recordPhysicalCount('product', id, ...)` — inject `MaterialService` into `AdminController`'s constructor alongside its existing `AdminService`/`StorageService`.

- [ ] **Step 10: Typecheck**

Run: `cd apps/api && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add apps/api/src/entities.ts apps/api/src/migrations/1720000020000-MaterialPhysicalCount.ts apps/api/src/app.module.ts apps/api/src/dto.ts apps/api/src/material.service.ts apps/api/src/controllers.ts apps/api/test/material-physical-count.test.cjs
git commit -m "api: physical stock counts, frozen at record time, flag a shortfall against tolerance"
```

---

## Task 6: Admin UI — recording counts, and the 4th Flags category

**Files:**
- Modify: `apps/api/src/controllers.ts` (`MaterialController` gains the `flags/shortfalls` route missed in Task 5 — see Step 1)
- Modify: `apps/admin/src/api.ts` (`recordMaterialCount`, `recordProductCount`, `flagMaterialShortfalls`)
- Modify: `apps/admin/src/Controls.tsx` (`MaterialsTab` gains a "Record count" action; `FlagsTab` gains the 4th section)
- Modify: `apps/admin/src/main.tsx` (Products/Inventory view gains a "Record count" action, same `prompt()`-based pattern as the existing `adjust()`)

**Interfaces:**
- Consumes: Task 5's two count routes, `MaterialService.recordPhysicalCount` and `flagShortfalls`.
- Produces: nothing new for later tasks — this is a leaf UI task.

- [ ] **Step 1: Add the three API client calls to `apps/admin/src/api.ts`**

`recordMaterialCount: <T>(id: string, data: unknown) => request<T>(\`/admin/materials/${id}/count\`, {method:'POST', body: JSON.stringify(data)})`, `recordProductCount` the equivalent under `/admin/products/${id}/count`, and `flagMaterialShortfalls: <T>(from: string, to: string) => request<T>(\`/admin/materials/flags/shortfalls?from=${from}&to=${to}\`)` — **note**: this requires a matching `GET admin/materials/flags/shortfalls` route; add it now to `MaterialController` in `apps/api/src/controllers.ts` (`@Get('flags/shortfalls') @UseGuards(AdminOnlyGuard) shortfalls(@Query('from') from: string, @Query('to') to: string) { return this.materials.flagShortfalls(from, to); }`) — this one route was missed in Task 5's file list; add it here rather than going back, and typecheck/test both apps together at the end of this task to confirm it compiles.

- [ ] **Step 2: Add "Record count" to `Controls.tsx`'s `MaterialsTab`**

A `prompt()`-based action next to the existing "Adjust" button, same interaction style as `adjust()` already in that file: ask for the measured quantity, optionally a note, call `api.recordMaterialCount`, reload.

- [ ] **Step 3: Add "Record count" to the Products/Inventory view in `main.tsx`**

Same pattern, next to the existing stock-`adjust()` prompt flow, calling `api.recordProductCount`.

- [ ] **Step 4: Add the 4th Flags category to `Controls.tsx`'s `FlagsTab`**

A fourth `data-table` section, "Material shortfalls," loaded alongside the other three in the existing `load()` function (`Promise.all` already fetches three — add `api.flagMaterialShortfalls(range)` as a fourth). Render each row as: target name, `measuredQuantity`/`expectedQuantity` with unit, `accountedForPercent`, who recorded it and when — composing the display text in the component (not expecting a pre-built sentence from the API), and **never render the word "theft"** anywhere in this component (anti-goal, worth a comment in the code at the point it'd be tempting to add one).

- [ ] **Step 5: Typecheck both apps**

Run: `cd apps/api && npx tsc --noEmit` and `cd apps/admin && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual check**

Run the API locally (fresh SQLite) and the admin app against it; sign in, create a roll material and a service via Tasks 1–2's new forms, record a physical count below its tolerance, confirm the new row appears in Controls → Flags with a sensible percentage and no mention of theft.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/controllers.ts apps/admin/src/api.ts apps/admin/src/Controls.tsx apps/admin/src/main.tsx
git commit -m "admin: record physical counts for materials and products; surface shortfalls as a 4th flag"
```

---

## Task 7: Owner dashboard — period presets, materials, and every flag

**Files:**
- Modify: `apps/admin/src/Analytics.tsx` (period presets, materials section, flags summary)
- Modify: `apps/admin/src/api.ts` (if a combined fetch helper is useful — see Step 2)

**Interfaces:**
- Consumes: `AnalyticsService.overview()` (existing, unchanged), `api.materials()` (existing), `api.flagCustomPriced`/`flagLateCancellations`/`flagUnattendedJobs`/`flagMaterialShortfalls` (existing + Task 6).
- Produces: nothing for a later task — this is the plan's last task.

- [ ] **Step 1: Add period presets to `Analytics.tsx`**

Replace or augment the existing `days` dropdown with preset buttons — **Today, This week, This month, This year, All-time** — each computing `from`/`to` strings (`YYYY-MM-DD`) and calling the existing `api.analytics(window)` with those (check the exact current call signature in `Analytics.tsx` before changing it — it already takes a `window`/`days` argument; extend rather than replace its plumbing). **All-time is capped at `overview()`'s existing 366-day maximum** (my call, stated in Global Constraints) — compute `from` as 366 days before today when "All-time" is selected, and if the shop's own data goes back further, the UI section for that preset says "Last 12 months" rather than claiming to show everything, so nobody reads a capped range as literally all-time.

- [ ] **Step 2: Add a "Materials" section to `Analytics.tsx`**

For the selected period: fetch `api.materials()` (gives every `MaterialItem` with current `stockQuantity`/`lowStock`) and sum `MaterialConsumption` logged in the period per material — this needs a small new read endpoint if nothing already exposes "consumption summed by material for a date range" (check `MaterialService.reconciliation`'s existing `loggedByMaterial` grouping first — if its shape already fits, reuse `api.materialReconciliation(from, to)` directly rather than adding a new endpoint; it already returns exactly `{materialName, totalQuantity, unit}` grouped for a range). Render as a table: material name, used this period, currently remaining.

- [ ] **Step 3: Add a flags summary to `Analytics.tsx`**

Four counts (custom-priced items, late cancellations/refunds, unattended jobs, material shortfalls) for the selected period, each a small stat with a link/button that switches to the `Controls` view's Flags tab for full detail — not a duplicate full listing here, per this task's own file list keeping `Controls.tsx` as the detail view and `Analytics.tsx` as the summary.

- [ ] **Step 4: Typecheck**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual check**

Run the API and admin app locally; click through each period preset and confirm no console errors, the materials table shows real data for a material with logged consumption, and the four flag counts match what Controls → Flags shows for the same range. Specifically exercise **All-time** (Review Focus: it must not throw against `overview()`'s 1–366-day validation) — confirm it loads cleanly and, if test data spans less than a year, that the label doesn't falsely claim to show more than the capped range.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/Analytics.tsx apps/admin/src/api.ts
git commit -m "admin: owner dashboard gets period presets, materials used/remaining, and every flag"
```

---

## After all tasks: whole-system check

Not a task of its own — run once the branch is otherwise done, before the final review:

- `npm run build:packages && npm run build -w @vikipat/api && node --test apps/api/test/*.test.cjs` — expect the same pre-existing, unrelated failures documented in `2026-10-31-internal-controls-system`'s ledger (in `production-visibility.test.cjs`/`staff-security.test.cjs`), nothing new.
- Full manual pass against a fresh local SQLite instance and the admin app: create a print service (Task 1), create a roll material for it with a real width/length (Task 2), set its tolerance (Task 3), place a walk-in order sized to fit that roll, release it, move its job to `in_production` and confirm the roll's stock dropped by the expected length (Task 4), record a physical count below tolerance and confirm the Controls → Flags "Material shortfalls" section shows it with a plain percentage and no mention of theft (Tasks 5–6), then open the Analytics dashboard, switch through every period preset, and confirm the materials table and flag counts render with no console errors (Task 7).
