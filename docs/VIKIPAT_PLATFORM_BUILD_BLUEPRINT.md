# Vikipat Business Platform — Build Blueprint

Version: 1.0  
Prepared: 12 September 2026  
Status: Implementation blueprint based on the current repository and the supplied Large Format Price List

## 1. Purpose

Vikipat will become an end-to-end order, production, sales, payment, delivery, and management platform for one printing and branding branch. It must handle:

- Guest orders placed on the customer storefront.
- Walk-in orders entered by staff.
- Orders brought in by salespeople.
- Physical products sold online or at the branch.
- Automatic estimates where a complete pricing rule exists.
- Staff-reviewed estimates where pricing cannot safely be automated.
- Paystack payments, including mobile money.
- Artwork intake, design work, proof approval, production, quality control, pickup, and delivery.
- Customer tracking without requiring an account.
- Operational, sales, inventory, financial, and management reporting.

This document is the build authority for the next implementation phases. It separates confirmed rules from configurable assumptions and unknown business data.

## 2. Confirmed Business Rules

### 2.1 Order channels

The system supports three order sources:

1. `online` — submitted by a guest through the storefront.
2. `walk_in` — entered by staff for a customer at the branch.
3. `salesperson` — entered by or attributed to a salesperson.

All three become normal job orders in the same production system. Source affects pricing, attribution, payment method, and reporting—not the quality of operational handling.

### 2.2 Customer identity and tracking

- Customers do not create accounts.
- Every order receives a unique, non-sequential public order number.
- An online customer tracks an order using order number plus the email attached to it.
- The system sends a one-time password to that email.
- Only after OTP verification does the customer see order details.
- Status notifications are sent by email for online orders.
- WhatsApp notifications are optional and only run when enabled and configured by an administrator.

### 2.3 Current service categories

- Labels
- Packaging
- DTF
- Large Format
- Corporate Branding
- Souvenirs
- Events

These are catalogue and reporting categories. Each category may contain multiple configurable services and products.

### 2.4 Designing fee

- Design work starts at GH₵100.00.
- GH₵100.00 is a minimum, not a fixed fee.
- A customer requesting design cannot receive a guaranteed final design price from the current data.
- The automated result must show a provisional minimum or place the design portion under review.
- Staff must set the final design fee before the customer completes payment when the fee is not already approved.

### 2.5 Confirmed large-format calculation

The supplied price document defines these price books:

- Employee
- Marketer/salesperson
- Walk-in

For dimensions in feet:

`base price = width × height × rate per square foot × quantity`

For dimensions in inches:

`base price = (width × height ÷ 144) × rate per square foot × quantity`

Confirmed large-format rates:

| Material/service | Employee | Marketer | Walk-in |
| --- | ---: | ---: | ---: |
| SAV / Sticker | GH₵2.10 | GH₵2.20 | GH₵2.40 |
| Flexy / Banner | GH₵2.30 | GH₵2.40 | GH₵2.60 |
| Oneway Vision | GH₵5.90 | GH₵6.05 | GH₵6.30 |
| Transparent SAV | GH₵3.80 | GH₵3.90 | GH₵4.10 |
| Reflective SAV | GH₵6.00 | GH₵6.15 | GH₵6.50 |
| Blueback | GH₵3.80 | GH₵3.90 | GH₵4.10 |
| Ash Back / PVC | GH₵7.00 | GH₵7.15 | GH₵7.30 |
| White Back | GH₵2.20 | GH₵2.35 | GH₵2.60 |
| Flag | GH₵5.40 | GH₵5.50 | GH₵5.80 |
| Cutting (SAV) | GH₵4.10 | GH₵4.20 | GH₵4.40 |
| Cutting (TSAV) | GH₵5.80 | GH₵5.90 | GH₵6.10 |
| Cutting Only | GH₵1.50 | GH₵1.60 | GH₵1.80 |
| Photopaper | GH₵5.90 | GH₵6.05 | GH₵6.10 |

The document's examples round GH₵23.40 to GH₵23.00 and GH₵11.67 to GH₵12.00. The current code therefore uses nearest-cedi rounding. This must remain a configurable pricing policy because the document demonstrates it but does not state whether every line, whole order, or only examples are rounded this way.

### 2.6 Online pricing policy pending confirmation

The document has no online price column. The current code temporarily maps online pricing to walk-in pricing. The admin system must expose an explicit online price book so this assumption can be changed without code deployment.

## 3. What Exists Today

### 3.1 Storefront

Implemented:

- React storefront and public catalogue.
- Product and category pages.
- A browser-side list that currently sends enquiries to WhatsApp.
- Quote request form and artwork upload.
- Order tracking page using order number, email, and OTP.

Missing:

- “Start a Print Order” journey.
- Service-specific configurators.
- Server-authoritative cart and estimate.
- Customer information, fulfilment, and checkout flow.
- Paystack payment initialization and confirmation.
- Proof approval/rejection interface.
- Delivery tracking and receipt/invoice access.

### 3.2 Existing NestJS API

Implemented:

- Product catalogue and stock fields.
- Admin authentication and CSRF protection.
- Quote requests and media upload.
- The 13 large-format rate records.
- Large-format calculation for feet and inches.
- Basic guest-order creation.
- Basic order status history.
- Tracking OTP and restricted customer order view.
- Email and optional WhatsApp outbox records.

Missing or insufficient:

- Payment entities, Paystack integration, webhook handling, reconciliation, and refunds.
- Draft checkout sessions and idempotent order submission.
- Multiple heterogeneous items per order.
- Versioned estimates and price snapshots.
- Service definitions and dynamic parameter schemas.
- Pricing modifiers, finishing, minimum charge, discounts, taxes, rush fees, and delivery fees.
- Artwork versions, proof versions, approvals, and comments.
- Production jobs, assignments, stages, due dates, time logs, and QC.
- Pickup and delivery fulfilment.
- Proper inventory movements and reservations.
- Ledger-grade financial transactions, expenses, cash sessions, and reporting.
- Role-based staff authentication.
- Background workers and retry scheduling.
- Database migrations; production currently uses schema synchronization, which must be removed.

### 3.3 Admin app

Implemented:

- Product catalogue management.
- Basic inventory adjustment.
- Quote-request list.
- Basic order list and status update.
- Business settings and WhatsApp switch.
- Simple dashboard summaries and audit activity.

Missing:

- Service and parameter configuration.
- Pricing rule builder and price-book management.
- Staff, role, salesperson, and permission management.
- Financial control and reports.
- Payment and settlement reconciliation.
- Discounts, overrides, refunds, expenses, and approvals.
- Production settings and workflow configuration.
- Notification templates and delivery configuration.
- Comprehensive audit trail and export.

### 3.4 Operations app

Not yet created. This is a required separate React application for daily staff work.

## 4. Target Application Architecture

The final platform contains three user-facing React applications, three NestJS API boundaries, and one background worker. All server components connect to the same PostgreSQL database, but each domain has clear ownership.

```text
Customer Storefront ──> Storefront API ─┐
Operations App ───────> Operations API ─┼──> PostgreSQL
Admin App ────────────> Admin API ──────┘
                                  │
                                  ├──> Job/notification worker
                                  ├──> Object storage
                                  ├──> Paystack
                                  ├──> Email provider
                                  └──> Optional WhatsApp provider
```

### 4.1 Frontend applications

#### A. Customer Storefront — `apps/storefront`

Audience: public customers.  
Purpose: discover services/products, obtain estimates, upload artwork, pay, approve proofs, and track orders.

#### B. Operations App — `apps/operations`

Audience: sales desk, salespeople, designers, production operators, QC, dispatch, and supervisors.  
Purpose: capture walk-in/salesperson orders and execute every paid or approved job.

#### C. Admin App — `apps/admin`

Audience: owner, finance, and authorised managers.  
Purpose: configure the business, control pricing, manage staff, review finances, reconcile payments, and inspect performance.

### 4.2 Backend applications

#### A. Storefront API — `apps/api` initially, renamed `apps/storefront-api` later

Owns public catalogue, guest checkout, estimates, payments, tracking, customer proof actions, and public uploads.

#### B. Operations API — `apps/operations-api`

Owns staff order capture, job queues, assignments, artwork/proof workflow, production, QC, fulfilment, and operational notes.

#### C. Admin API — `apps/admin-api`

Owns configuration, pricing, finance, staff/RBAC, reporting, audits, integrations, and administrative approvals.

### 4.3 Shared packages

- `packages/database`: TypeORM configuration, migrations, entity mappings, and transaction helpers.
- `packages/domain`: order states, money/value objects, pricing types, permission names, events, and invariant checks.
- `packages/contracts`: shared request/response schemas generated from or compatible with API OpenAPI definitions.
- `packages/pricing-engine`: deterministic calculators with no HTTP or UI dependency.
- `packages/ui`: shared accessible components and tokens for staff applications only; storefront retains its distinct visual identity.
- `packages/config`: validated environment configuration.
- `packages/testing`: factories, fixtures, and integration-test helpers.

### 4.4 Shared database rules

Separate APIs may use the same PostgreSQL database, provided that:

- Schema changes are made only through versioned migrations in `packages/database`.
- `synchronize: true` is disabled outside throwaway local development.
- One module is the documented writer for each aggregate.
- Other APIs call the owning API for complex state changes rather than modifying its tables directly.
- Cross-domain reads use stable repositories or read models.
- All writes that affect money, payment, order state, or inventory are transactional.
- Every externally retried command accepts an idempotency key.

### 4.5 Background worker — `apps/worker`

The worker processes durable jobs outside web requests:

- Email and WhatsApp notification retries.
- Paystack reconciliation.
- Abandoned checkout expiration.
- Unpaid-order reminders.
- Due-date and overdue alerts.
- Scheduled reports.
- File malware-scan workflow.
- Thumbnail/preview generation where supported.

Use PostgreSQL-backed jobs initially to avoid introducing Redis prematurely. Add Redis/BullMQ only when throughput or scheduling requirements justify it.

## 5. Core Customer Journey

### 5.1 Entry points

The storefront must expose:

- Primary navigation action: **Start a Print Order**.
- Service cards with **Configure & estimate**.
- Product cards with **Add to cart**.
- Persistent **Track order** action.

### 5.2 Order builder steps

#### Step 1 — Choose work

Customer chooses:

- A configurable print/branding service.
- A fixed-price physical product.
- Or both in the same order when fulfilment rules allow it.

#### Step 2 — Configure each item

The UI renders fields from the active service-version schema. Examples:

- Material/service.
- Width and height.
- Unit: feet or inches.
- Quantity.
- Single design repeated across quantity or multiple unique artworks.
- Printing only, cutting only, or printing plus finishing where configured.
- Artwork ready, needs checking, or needs Vikipat design.
- Finishing options.
- Required date.

Only confirmed parameters are displayed for an automatically priced service. Unknown options must be collected for staff review, not silently priced at zero.

#### Step 3 — Live estimate

Every relevant field change requests a server estimate. The response includes:

- Itemized base printing amount.
- Selected modifiers.
- Provisional design amount or “requires review.”
- Delivery amount or “calculated after location review.”
- Discount, if applicable.
- Tax, when configured.
- Total payable now.
- Estimate status: `final`, `provisional`, or `manual_review`.
- Explanation of what can still change.
- Expiry time and pricing version.

The browser never calculates the authoritative charge.

#### Step 4 — Artwork

Customer selects one:

- Upload print-ready artwork.
- Upload reference artwork that needs checking.
- Request Vikipat design.
- Supply artwork later.

Uploads are attached to the draft order, not exposed through guessable public URLs, and scanned before staff download.

#### Step 5 — Customer and fulfilment

Required:

- Full name.
- Email.
- Phone/WhatsApp.
- Pickup or delivery.
- Delivery address and landmark when delivery is selected.
- Deadline/requested date.
- Order notes.
- Acceptance of order and artwork terms.

Optional:

- Company name.
- GhanaPost GPS/digital address.
- Recipient name and alternate phone.

#### Step 6 — Review

Show an immutable checkout summary:

- Every item and specification.
- Artwork state.
- Fulfilment choice.
- Price breakdown.
- Estimated or promised timing wording.
- Refund/reprint and artwork confirmation terms.

#### Step 7 — Payment or review

If the estimate is final:

1. Create a pending order and Paystack transaction reference on the server.
2. Redirect/open Paystack checkout.
3. Verify payment on the server after redirect.
4. Independently process the signed Paystack webhook.
5. Mark payment successful exactly once.
6. Confirm the order and release its production job.

If manual review is required:

1. Create an order in `price_review` without requesting payment.
2. Staff confirms or edits the price with a reason.
3. Customer receives a secure quote link.
4. Customer accepts and pays.
5. Only confirmed payment moves the job into the production intake queue.

#### Step 8 — Confirmation

Display and email:

- Order number.
- Payment receipt/reference.
- Current status.
- Next expected action.
- Tracking link.
- Pickup/delivery summary.

### 5.3 No-account recovery

- Draft carts persist locally for convenience but are never the financial source of truth.
- A submitted order can be recovered through order number and email OTP.
- Secure action links for quote acceptance and proof approval are short-lived, scoped, revocable, and single-purpose.
- Email changes require staff verification and an audit record.

## 6. Pricing Engine Blueprint

### 6.1 Principles

- Prices are stored as integer pesewas.
- Decimal arithmetic is used for area and intermediate calculations.
- The server is authoritative.
- Pricing is deterministic for a fixed input and rule version.
- Every estimate stores the exact rule version and calculation breakdown.
- Published rules are immutable; changes create a new version with an effective date.
- Existing paid orders never change when future prices change.
- An incomplete rule produces manual review, never a fabricated zero price.

### 6.2 Pricing outcomes

- `final`: safe to pay immediately.
- `provisional`: displays a minimum/range but cannot be paid until confirmed.
- `manual_review`: insufficient pricing data; staff must quote.
- `invalid`: impossible or unsupported input.

### 6.3 Price books

- `online`
- `walk_in`
- `marketer`
- `employee`

Each service version has an explicit rate or adjustment for each permitted price book. Staff price books are permission-controlled. A customer can never select one through the public API.

### 6.4 Calculator types

The engine must support plugins rather than one hard-coded formula:

- Area rate: width × height × area rate × quantity.
- Fixed unit: fixed price × quantity.
- Quantity tier: price selected from quantity bands.
- Size/quantity matrix: lookup by standard size and volume.
- Per-sheet/up calculation: sheet size, item size, imposition, wastage, sheet rate.
- Material consumption: units consumed × material rate plus setup.
- Apparel/DTF: garment + print area/size + locations + colours/options + quantity tiers.
- Embroidery: garment + stitch/complexity tier + positions + quantity + digitising/setup.
- Packaging: dimensions + material + print treatment + finishing + quantity/minimum run.
- Composite/bundle: sum of multiple child calculators.
- Manual quote: collects specifications but does not calculate a payable amount.

Only `area rate` is currently backed by supplied business prices.

### 6.5 Large-format calculator v1

Inputs:

- Active material/service code.
- Width greater than zero.
- Height greater than zero.
- Unit of feet or inches.
- Quantity as a positive whole number.
- Order source, determined by the trusted server context.
- Design requirement.

Algorithm:

1. Resolve the active service/rate version at the current time.
2. Convert dimensions to square feet.
3. Multiply square feet by the correct price-book rate and quantity.
4. Apply the configured rounding stage and mode.
5. Add only configured finishing/modifier charges.
6. If design is requested, add the configured minimum presentation amount and mark the design component for review unless staff finalises it.
7. Apply authorised discount, tax, rush, and delivery rules in their configured order.
8. Return the full breakdown and a SHA-256 fingerprint of normalized inputs and rule versions.

Required tests include the two examples from the source document:

- Banner: 3 ft × 3 ft × GH₵2.60 × 1 → GH₵23.00 under nearest-cedi policy.
- Sticker: 3.5 in × 2 in ÷ 144 × GH₵2.40 × 100 → GH₵12.00 under nearest-cedi policy.

### 6.6 Pricing modifiers to support as configuration

These are engine capabilities, not assumed active charges:

- Setup charge.
- Minimum line charge.
- Finishing charge.
- Cutting charge.
- Rush surcharge.
- Delivery charge.
- Design charge.
- Quantity discount.
- Promotion/coupon.
- Tax.
- Manual adjustment with approval.
- Staff/employee price.
- Salesperson/marketer price.

### 6.7 Estimate lifecycle

`draft → calculated → final/provisional/manual_review → accepted → superseded/expired`

An estimate stores:

- Customer-visible total and breakdown.
- Internal cost and margin fields where configured.
- Input snapshot.
- Rule/version snapshot.
- Currency.
- Valid-until timestamp.
- Reason for manual review.
- Creator and channel.
- Any authorised override, approver, reason, and timestamp.

## 7. Order and Production State Machines

Payment state, commercial order state, production state, artwork state, and fulfilment state must be separate. One overloaded status field cannot accurately model real work.

### 7.1 Commercial order state

```text
draft
  ├──> price_review ──> awaiting_customer_acceptance
  └──> awaiting_payment
awaiting_customer_acceptance ──> awaiting_payment
awaiting_payment ──> confirmed
confirmed ──> in_fulfilment ──> completed
any eligible state ──> on_hold / cancelled
```

### 7.2 Payment state

- `not_required_yet`
- `unpaid`
- `initiated`
- `paid`
- `part_paid` for authorised staff-entered orders only
- `failed`
- `refunding`
- `part_refunded`
- `refunded`
- `chargeback`

### 7.3 Artwork state per item

- `not_required`
- `awaiting_upload`
- `uploaded`
- `preflight_review`
- `changes_required`
- `design_in_progress`
- `proof_ready`
- `awaiting_customer_approval`
- `approved`
- `rejected`
- `production_ready`

### 7.4 Production job state per item/batch

- `not_released`
- `queued`
- `assigned`
- `in_progress`
- `paused`
- `blocked`
- `ready_for_qc`
- `qc_failed`
- `rework`
- `qc_passed`
- `packed`
- `done`

### 7.5 Fulfilment state

- `not_ready`
- `ready_for_pickup`
- `awaiting_dispatch`
- `out_for_delivery`
- `delivery_failed`
- `delivered`
- `collected`

### 7.6 Transition safeguards

- An unpaid online order cannot be released to production unless an authorised manager grants a recorded credit/exception.
- A job requiring artwork cannot enter production until the active proof/artwork version is approved.
- QC failure creates a rework cycle; it cannot be disguised as a normal backward status edit.
- Completion requires all items complete and the fulfilment handoff recorded.
- Cancellation after production starts requires a permission, reason, and financial disposition.
- Every transition writes an append-only event with actor, timestamp, reason, visibility, and previous/new state.

## 8. Operations App Blueprint

### 8.1 Role-oriented workspace

Roles:

- Front desk/cashier.
- Salesperson.
- Estimator.
- Designer.
- Production operator.
- Quality control.
- Dispatch.
- Operations supervisor.

Users see only permitted queues and actions. Supervisors can view the whole floor.

### 8.2 Main navigation

- Command centre.
- New order.
- Intake/review.
- Artwork & proofs.
- Production board.
- Quality control.
- Ready/pickup.
- Deliveries.
- Customers.
- Inventory usage.
- My work.

### 8.3 Command centre

- New online orders awaiting review.
- Paid jobs not released.
- Jobs due today and overdue.
- Artwork waiting on staff/customer.
- Production queue by stage and workstation.
- QC failures/rework.
- Ready jobs awaiting pickup/dispatch.
- Operational blockers.

### 8.4 Walk-in and salesperson order capture

Staff use the same pricing engine as the storefront with trusted source-derived price books. The flow supports:

- Find/create lightweight customer record.
- Multiple job items.
- Immediate estimate or manual quote.
- Cash, mobile money through Paystack, bank transfer, or authorised credit/part payment.
- Receipt generation.
- Salesperson attribution.
- Optional quick order for fixed-price counter products.

No UI-provided `priceBook` is trusted; the API derives it from authenticated role, selected source, and permission.

### 8.5 Job detail workspace

One screen should show:

- Order and customer summary.
- Payment readiness—not sensitive card/mobile-money details.
- Item specifications and calculation snapshot.
- Artwork files and version history.
- Proof status and customer response.
- Assigned staff/workstation.
- Due/promised date and risk indicator.
- Internal notes separated from customer-visible updates.
- Production checklist.
- QC checklist and evidence.
- Pickup/delivery information.
- Complete audit timeline.

### 8.6 Production board

- Kanban/list views by real production stage.
- Filters for due date, service, workstation, assignee, source, salesperson, and risk.
- Batch assignment and printing where safe.
- Drag/drop only when the same transition rules are enforced by the API.
- Optimistic UI with rollback and visible failure messages.
- Live refresh using server-sent events initially; WebSockets only if two-way live collaboration becomes necessary.

### 8.7 Proof workflow

1. Staff uploads a proof version.
2. The system creates a non-public, expiring customer action link.
3. Customer views the proof and either approves or requests changes with a comment.
4. Approval records proof checksum, version, timestamp, IP/security metadata, and acceptance wording.
5. Rejection creates a new revision cycle; previous proof remains immutable.
6. Only the approved version can be marked production-ready.

### 8.8 QC and rework

- Configurable checklist by service.
- Quantity produced, accepted, wasted, and reworked.
- Defect reason and notes.
- Optional photo evidence.
- Pass/fail decision.
- Failed QC creates a linked rework attempt and updates cost/waste reporting.

### 8.9 Pickup and delivery

Pickup:

- Ready notification.
- Collector name and phone.
- Pickup timestamp.
- Staff member handling handoff.
- Optional collection code/signature.

Delivery:

- Address, landmark, GhanaPost GPS, recipient, and phone.
- Assigned driver/courier.
- Dispatch time and delivery fee.
- Delivered/failed outcome, timestamp, proof, and reason.
- Reattempt tracking without losing the first attempt.

## 9. Admin App Blueprint

### 9.1 Business configuration

- Business identity, branch, contacts, currency, and receipt details.
- One active branch now, with branch-ready IDs in data models.
- Operating hours and default lead times.
- Pickup and delivery settings.
- Email and optional WhatsApp settings.

### 9.2 Service catalogue builder

Admin can:

- Create category and service.
- Choose calculator type.
- Define customer-facing parameter fields and validations.
- Configure allowed materials/options.
- Configure lead-time rules.
- Configure artwork requirements.
- Create, preview, publish, retire, and schedule service versions.
- Run test estimates before publishing.

Published versions are not edited in place.

### 9.3 Pricing studio

- Four price books.
- Rate tables and tiers.
- Design minimum starting at GH₵100.
- Rounding policy.
- Minimum charges and modifiers.
- Effective dates.
- Draft/published states.
- Side-by-side old/new comparison.
- Test calculator with full breakdown.
- Approval requirement for sensitive changes.
- Audit log and rollback by republishing an earlier version.

### 9.4 Staff and access

- Invite/deactivate staff.
- Assign roles and granular permissions.
- Force password reset and revoke sessions.
- Optional MFA, required for owner/finance roles before production launch.
- Salesperson attribution and activity.
- Never share one generic admin account.

### 9.5 Financial management

- Sales dashboard by date, source, service, product, and salesperson.
- Payment status and method.
- Paystack transaction and settlement reconciliation.
- Cash register sessions for walk-in payments.
- Bank-transfer recording with approval.
- Customer balances and authorised credit.
- Refunds, partial refunds, cancellations, and write-offs.
- Discounts and manual price overrides.
- Business expenses and categories.
- Gross sales, discounts, refunds, net sales, collected cash, receivables, estimated direct cost, and gross margin.
- Exportable transaction and sales reports.

The application provides operational accounting and management reporting. It should not be represented as a statutory general ledger until accounting rules, chart of accounts, tax treatment, and accountant-approved reports are separately defined.

### 9.6 Management dashboards

- Orders and revenue by source.
- Sales and collection trend.
- Best-selling services/products.
- Average order value.
- Quote-to-payment conversion.
- On-time completion rate.
- Work in progress and queue age.
- Rework/waste rate.
- Outstanding balances.
- Paystack settlement exceptions.
- Salesperson performance.

## 10. Payments with Paystack

### 10.1 Integration rules

- Secret keys exist only on the server.
- The server generates a unique payment reference.
- Amount, currency, email, order ID, and estimate version are recorded before initialization.
- Never mark an order paid from the browser redirect alone.
- Verify the transaction against Paystack from the server.
- Validate webhook signatures using the raw request body.
- Process webhook events idempotently; duplicate and out-of-order events are expected.
- Confirm reference, expected amount, currency, and customer/order association.
- Store provider payloads with sensitive fields redacted.
- Record each payment state change in an append-only transaction history.

### 10.2 Payment edge cases

- Customer closes checkout before returning.
- Paystack succeeds but redirect fails.
- Redirect reports success before webhook arrival.
- Webhook arrives more than once.
- Webhook arrives before redirect verification.
- Amount/reference does not match.
- Payment fails and is retried with a new reference.
- Two payments are attempted for the same order.
- Price changes after checkout initialization.
- Manual review changes the order total.
- Partial walk-in payment.
- Refund is partial, full, failed, or pending.
- Chargeback/dispute occurs.

### 10.3 Payment/order release rule

One transaction-safe command handles successful payment:

1. Lock the payment/order rows.
2. Ignore an already-processed provider event.
3. Validate amount and currency.
4. Mark the payment paid.
5. Recalculate the order's paid balance.
6. Confirm the commercial order when fully paid.
7. Create/release production jobs when artwork requirements allow it.
8. Append audit/domain events.
9. Queue receipt and confirmation notifications.
10. Commit once.

## 11. Product Sales and Inventory

Services and stocked products are different item types but may share an order.

### 11.1 Product catalogue

- SKU, name, category, description, images, selling price, active state.
- Stock-tracked or made-to-order flag.
- Variants such as size/colour where needed.
- Reorder level.
- Cost price for margin reporting, permission-restricted.

### 11.2 Inventory ledger

Replace the current overwrite-only stock model with append-only movements:

- Opening balance.
- Purchase/stock-in.
- Sale reservation.
- Reservation release.
- Sale issue.
- Production consumption.
- Waste/damage.
- Return.
- Manual adjustment with reason and permission.

Stock on hand is derived from movements. Available stock subtracts active reservations. Payment confirmation converts an online reservation into committed fulfilment.

### 11.3 Mixed cart behaviour

- Each line identifies `service` or `product`.
- Products can be reserved for a short checkout window.
- Services follow artwork/production workflows.
- The order is complete only when all lines are fulfilled.
- Split fulfilment is supported internally, but the customer sees clear per-item progress.

## 12. Data Model

Core tables/aggregates to implement:

### Identity and access

- `users`
- `roles`
- `permissions`
- `user_roles`
- `role_permissions`
- `sessions`
- `login_attempts`

### Business and configuration

- `businesses`
- `branches`
- `business_settings`
- `integration_settings` with encrypted secrets or external secret references
- `notification_templates`

### Services and pricing

- `service_categories`
- `services`
- `service_versions`
- `service_parameters`
- `service_options`
- `price_books`
- `pricing_rule_versions`
- `pricing_rates`
- `pricing_modifiers`
- `pricing_tests`
- `estimates`
- `estimate_items`
- `estimate_adjustments`

### Customers and orders

- `customers` as lightweight deduplicated records, not login accounts
- `customer_addresses`
- `orders`
- `order_items`
- `order_item_specifications`
- `order_adjustments`
- `order_state_events`
- `customer_action_tokens`
- `tracking_otps`

### Artwork and production

- `files`
- `order_item_files`
- `artwork_versions`
- `proof_versions`
- `proof_responses`
- `production_jobs`
- `job_assignments`
- `job_stage_events`
- `job_notes`
- `quality_checks`
- `quality_check_items`
- `waste_records`

### Payment and finance

- `payment_attempts`
- `payment_transactions`
- `payment_events`
- `refunds`
- `cash_sessions`
- `cash_movements`
- `expenses`
- `expense_categories`
- `financial_adjustments`
- `provider_settlements`
- `settlement_lines`

### Products and stock

- `products`
- `product_variants`
- `inventory_locations`
- `inventory_movements`
- `stock_reservations`

### Fulfilment and communication

- `fulfilments`
- `delivery_attempts`
- `pickup_handoffs`
- `notification_outbox`
- `notification_attempts`
- `audit_logs`

### Model conventions

- UUID primary keys internally.
- Human-safe public references for orders, receipts, jobs, and payments.
- Integer pesewas for stored money.
- UTC timestamps; render in Africa/Accra.
- Soft retirement for configuration and services; never delete financial history.
- JSON only for versioned snapshots/flexible parameters, not for relationships that require querying or constraints.
- Optimistic version column on frequently edited operational records.

## 13. API Surface

Representative endpoints; the OpenAPI contract is generated and versioned before implementation.

### 13.1 Storefront API

```text
GET    /api/v1/catalog
GET    /api/v1/services
GET    /api/v1/services/:slug/configuration
POST   /api/v1/estimates
POST   /api/v1/checkout-sessions
PATCH  /api/v1/checkout-sessions/:id
POST   /api/v1/checkout-sessions/:id/files
POST   /api/v1/checkout-sessions/:id/submit
POST   /api/v1/orders/:publicNumber/payments/paystack
GET    /api/v1/payments/paystack/callback
POST   /api/v1/webhooks/paystack
POST   /api/v1/tracking/request-otp
POST   /api/v1/tracking/verify-otp
GET    /api/v1/tracking/order
GET    /api/v1/customer-actions/:token/proof
POST   /api/v1/customer-actions/:token/proof/approve
POST   /api/v1/customer-actions/:token/proof/request-changes
GET    /api/v1/customer-actions/:token/quote
POST   /api/v1/customer-actions/:token/quote/accept
```

### 13.2 Operations API

```text
POST   /api/v1/ops/auth/login
GET    /api/v1/ops/me
GET    /api/v1/ops/dashboard
GET    /api/v1/ops/orders
POST   /api/v1/ops/orders
GET    /api/v1/ops/orders/:id
POST   /api/v1/ops/orders/:id/estimate
POST   /api/v1/ops/orders/:id/confirm-price
POST   /api/v1/ops/orders/:id/payments/manual
POST   /api/v1/ops/items/:id/artwork
POST   /api/v1/ops/items/:id/proofs
POST   /api/v1/ops/jobs/:id/assign
POST   /api/v1/ops/jobs/:id/transitions
POST   /api/v1/ops/jobs/:id/qc
POST   /api/v1/ops/fulfilments/:id/dispatch
POST   /api/v1/ops/fulfilments/:id/deliver
POST   /api/v1/ops/fulfilments/:id/collect
GET    /api/v1/ops/events/stream
```

### 13.3 Admin API

```text
POST   /api/v1/admin/auth/login
GET    /api/v1/admin/dashboard
CRUD   /api/v1/admin/services
CRUD   /api/v1/admin/pricing/drafts
POST   /api/v1/admin/pricing/drafts/:id/test
POST   /api/v1/admin/pricing/drafts/:id/publish
CRUD   /api/v1/admin/users
CRUD   /api/v1/admin/roles
GET    /api/v1/admin/orders
GET    /api/v1/admin/payments
POST   /api/v1/admin/refunds
GET    /api/v1/admin/settlements
POST   /api/v1/admin/settlements/reconcile
CRUD   /api/v1/admin/expenses
GET    /api/v1/admin/reports/sales
GET    /api/v1/admin/reports/operations
GET    /api/v1/admin/reports/finance
GET    /api/v1/admin/audit-log
```

## 14. Security and Reliability Baseline

### 14.1 Authentication and authorisation

- Separate cookie names and JWT audiences for customer tracking, operations, and admin.
- HttpOnly, Secure, SameSite cookies.
- CSRF defence on cookie-authenticated mutations.
- Short staff sessions with controlled renewal and server-side revocation.
- Argon2id preferred for new password hashes; migrate existing bcrypt hashes upon login if retained.
- MFA for owner/finance and sensitive actions.
- Permission checks in API services, never only hidden UI buttons.
- Step-up authentication for refunds, price-book publication, user/role changes, and integration-secret changes.

### 14.2 Public attack protection

- Rate limiting by IP and normalized identity.
- Generic OTP responses to prevent order/email discovery.
- OTP expiry, attempt cap, one-time consumption, and hashed storage.
- Bot defence/honeypot on checkout and quote forms.
- Idempotency keys on submit/payment endpoints.
- Strict DTO validation and unknown-field rejection.
- Content Security Policy and secure headers.

### 14.3 File security

- Store uploads in private S3-compatible object storage for production.
- Presigned upload/download URLs with expiry and authorization.
- Allowlisted file types, magic-byte validation, size/page/dimension limits.
- Random storage keys; original names are metadata only.
- Malware scanning before staff access.
- SVG, executable, macro-enabled, and archive uploads blocked initially.
- Every proof/artwork version is immutable and checksummed.

### 14.4 Data and money integrity

- Database constraints for positive quantities, non-negative money, unique references, and valid relationships.
- Transactions and row locks for payment, stock, and critical state transitions.
- Append-only payment events, inventory movements, and state events.
- Provider webhook event uniqueness.
- Audit sensitive changes with before/after summaries.
- Secrets live outside source control and are encrypted/managed by deployment secrets.
- Production database backups plus tested restore drills.

### 14.5 Observability

- Structured logs with request and correlation IDs.
- Error monitoring for frontend and APIs.
- Metrics for API latency/errors, job backlog, notification failures, webhook failures, and database health.
- Health/readiness endpoints.
- Alerting on payment mismatch, settlement mismatch, backup failure, and repeated notification failure.

## 15. Notifications

Events that can produce customer notifications:

- Order received.
- Manual estimate ready.
- Payment received/failed.
- Artwork changes required.
- Proof ready for approval.
- Proof changes received.
- Production started where desired.
- Ready for pickup.
- Out for delivery.
- Delivered/completed.
- Order on hold/cancelled/refunded.

Rules:

- Email is the default for online orders.
- WhatsApp is generated only when the admin switch and provider are active and customer consent/valid number requirements are satisfied.
- Notification work is queued after the business transaction commits.
- Failed messages retry with backoff and enter a dead-letter view for staff.
- Templates are versioned and previewable.
- Internal notes never appear in customer messages.

## 16. Financial Definitions

Reports must use consistent definitions:

- Gross sales: item and service charges before discounts/refunds.
- Discount: authorised reduction recorded separately.
- Net sales: gross sales minus discounts and refunds, under the chosen reporting basis.
- Collections: successful money received in the period.
- Receivables: confirmed order balance still owed.
- Direct cost: configured product/material/production cost attributable to fulfilled work.
- Gross margin: net sales minus direct cost.
- Cash variance: expected cash versus counted cash for a closed cash session.

Dashboards must label whether figures use order date, payment date, or completion date. Never mix them invisibly.

## 17. Critical Edge Cases

### Pricing and specification

- Zero, negative, excessive, fractional, or mismatched quantities.
- Width/height entered in the wrong unit.
- Multiple pieces with different dimensions.
- Same design repeated versus multiple unique designs.
- Unsupported combination of material and finishing.
- Minimum printable size, maximum machine width, tiling/panel joins, and wastage.
- Rule changed while customer is checking out.
- Expired estimate.
- Design requested with only a GH₵100 minimum known.
- Staff override below permitted margin/price.

### Artwork

- No file supplied.
- Corrupt, unsafe, password-protected, low-resolution, or unsupported file.
- Several files mapped to several order items.
- Customer replaces a file after proofing.
- Staff accidentally attempts production with an unapproved version.
- Customer rejects proof repeatedly.

### Orders and production

- Mixed order with products ready before services.
- One item cancelled from a multi-item order.
- Quantity changes after payment.
- Urgent job accepted without capacity.
- Staff member unavailable after assignment.
- Machine failure blocks a job.
- Partial production, spoilage, QC failure, and reprint.
- Duplicate job release from repeated requests.

### Customer and fulfilment

- Email typo prevents tracking.
- Customer requests email/phone/address change.
- Customer loses order number.
- Pickup by a different person.
- Delivery address is incomplete.
- Delivery fails or requires reattempt.
- Customer does not collect a completed order.

### Payment and finance

- Successful payment not reflected immediately.
- Duplicate webhook.
- Underpayment/overpayment.
- Manual cash entry error.
- Refund after partial production.
- Cancellation fee or non-refundable design work.
- Paystack settlement differs from recorded transactions.

Every edge case must end in a named state, a visible next action, and an audit record. No order should disappear into an unlabelled exception.

## 18. Implementation Phases

### Phase 0 — Foundation and migration safety

Deliverables:

- Create shared packages and API boundaries.
- Add migration tooling and baseline the existing database.
- Remove production schema synchronization.
- Add common money, ID, event, audit, and permission foundations.
- Add CI checks: lint, type-check, unit, integration, migration, and production builds.
- Add local Docker services for all applications.

Exit criteria:

- Existing storefront/admin behaviour still works.
- A fresh database and an existing database both migrate successfully.
- No API can start in production with unsafe default secrets or synchronization enabled.

### Phase 1 — Service catalogue and pricing engine

Deliverables:

- Versioned service catalogue.
- Four price books.
- Calculator plugin contract.
- Large-format calculator using the 13 supplied rates.
- Estimate persistence and calculation explanation.
- Admin pricing studio v1 with draft, test, and publish.
- Golden tests for supplied examples and every material/price book.

Exit criteria:

- Staff can change and publish rates without deployment.
- Historical estimates retain their original amounts.
- Incomplete services reliably return manual review.

### Phase 2 — Customer order builder

Deliverables:

- “Start a Print Order” storefront entry.
- Service selection and dynamic large-format configurator.
- Multi-item server-authoritative draft cart.
- Live estimates.
- Artwork intake.
- Customer and fulfilment steps.
- Review and submit.
- Manual-price-review branch.

Exit criteria:

- A guest can configure a supported large-format job and receive the correct estimate.
- A customer can submit any other category for review without an invented price.
- Refresh/retry does not duplicate an order.

### Phase 3 — Paystack and receipts

Deliverables:

- Payment initialization, callback verification, signed webhook handling, and idempotency.
- Payment transaction history.
- Confirmation page and emailed receipt.
- Failed/retry flow.
- Admin transaction search and mismatch queue.

Exit criteria:

- Paystack sandbox mobile-money/card flows pass.
- Duplicate/out-of-order webhooks cannot double-pay or double-release a job.
- Amount mismatch is quarantined and visible to finance.

### Phase 4 — Operations app MVP

Deliverables:

- Operations authentication and RBAC.
- Command centre.
- Walk-in/salesperson order entry.
- Online intake and price review.
- Job detail and assignments.
- Production board and controlled transitions.
- Customer-visible versus internal notes.

Exit criteria:

- A paid online job appears automatically in the correct queue.
- Staff can create and process walk-in/salesperson jobs.
- Every transition is permission-checked and audited.

### Phase 5 — Artwork, proof, QC, and fulfilment

Deliverables:

- Private file storage and malware scan path.
- Artwork/preflight workflow.
- Versioned proofs and customer approval portal.
- QC checklists and rework.
- Pickup and delivery tracking.
- Email and optional WhatsApp lifecycle notifications.

Exit criteria:

- Production cannot use an unapproved artwork version.
- Rework and waste are traceable.
- Customer sees an accurate, simplified timeline through OTP tracking.

### Phase 6 — Products and inventory

Deliverables:

- Product variants and SKU management.
- Mixed cart checkout.
- Stock reservations.
- Append-only inventory ledger.
- Production material usage and waste.
- Low-stock and exception views.

Exit criteria:

- Concurrent purchases cannot oversell tracked stock.
- Every stock balance can be explained by movements.

### Phase 7 — Finance and management

Deliverables:

- Cash sessions and manual payment controls.
- Expenses.
- Discounts, overrides, balances, refunds, and approvals.
- Paystack settlement reconciliation.
- Sales, operations, finance, and salesperson reporting.
- CSV/PDF export where needed.

Exit criteria:

- Daily collections reconcile by method.
- Owner can trace every dashboard number to underlying transactions.
- Refunds and overrides require permission and leave an audit trail.

### Phase 8 — Hardening and launch

Deliverables:

- Threat review and penetration testing of high-risk flows.
- Load tests for estimate, checkout, tracking OTP, and staff queues.
- Accessibility and mobile testing.
- Backup/restore drill.
- Monitoring, alerting, runbooks, and incident procedures.
- Data retention and privacy controls.
- Staff training and staged rollout.

Exit criteria:

- No unresolved critical/high security findings.
- Restore test meets agreed recovery targets.
- Paystack production checklist and operational acceptance testing pass.

## 19. Recommended Build Slices

Build vertical slices that produce a usable outcome instead of completing all database work before UI:

1. Large-format service → live estimate → persisted estimate → admin-editable rate.
2. Guest checkout → pending order → tracking page.
3. Paystack payment → confirmed order → operations intake.
4. Price-review order → staff quote → customer acceptance/payment.
5. Artwork upload → proof → customer approval → production release.
6. Production assignment → QC → pickup completion.
7. Delivery order → dispatch → proof of delivery.
8. Walk-in order → manual payment → receipt → same production flow.
9. Product order → stock reservation → payment → issue.
10. Finance event → reconciliation → management report.

Each slice includes schema migration, domain logic, API contract, frontend, audit, notifications, permissions, automated tests, and telemetry.

## 20. Test Strategy

### Unit tests

- Every calculator and rounding mode.
- State transition guards.
- Permission policies.
- Money allocation and refunds.
- Notification eligibility.

### Integration tests

- PostgreSQL migrations and constraints.
- Estimate persistence/versioning.
- Order submission idempotency.
- Payment webhook idempotency and amount validation.
- Stock reservation concurrency.
- OTP expiry/attempt handling.
- Proof approval version correctness.

### Contract tests

- React clients against OpenAPI schemas.
- Paystack, email, and WhatsApp adapters against recorded/sandbox behaviours.

### End-to-end tests

- Automatic online large-format order through payment and completion.
- Manual review through staff quote and customer payment.
- Walk-in order with cash/part payment.
- Artwork rejection/revision/approval.
- QC failure and rework.
- Pickup and failed/retried delivery.
- Refund and reconciliation.

### Non-functional tests

- Responsive customer flow on low-end mobile devices.
- Keyboard and screen-reader accessibility.
- Reduced-motion support.
- Upload limits and unsafe-file rejection.
- Rate limiting and authorization abuse cases.
- Performance under realistic staff polling/live-update load.

## 21. Definition of Done

A feature is complete only when:

- Business rule and edge cases are documented.
- Database migration is reversible or has a safe forward-fix plan.
- API validates input and enforces authorization.
- UI has loading, empty, validation, error, success, offline/retry, and permission states.
- Money and state changes are transactional and audited.
- Customer/internal visibility is explicitly tested.
- Unit/integration/E2E coverage matches risk.
- Accessibility and responsive checks pass.
- Logs/metrics reveal failures without exposing personal data or secrets.
- Documentation and operational runbook are updated.

## 22. Current Data Coverage and Remaining Business Inputs

The current information is enough to build:

- The full platform architecture.
- Guest, walk-in, and salesperson order foundations.
- The service/pricing configuration framework.
- Large-format automatic estimation for all 13 supplied rates.
- A safe manual-review path for design work and all services without complete pricing.
- Paystack, production, tracking, delivery, notification, inventory, and finance infrastructure.

The current information is **not** enough to automatically calculate final prices for:

- Labels beyond the large-format SAV/sticker area rule.
- Packaging.
- DTF and branded garments.
- Embroidery.
- Corporate branding bundles.
- Souvenirs.
- Event work.
- Finishing, installation, transport/delivery, rush work, taxes, discounts, or minimum charges.
- Final design fees above the GH₵100 starting point.

These gaps do not block construction. They become inactive/manual-review service configurations. As Vikipat supplies each rule, an administrator can configure, test, and publish it without redesigning the engine.

The smallest future business-input sheet per service is:

1. Service name and category.
2. Fields the customer must provide.
3. Which combinations are allowed.
4. Exact formula or price table.
5. Minimum charge/order quantity.
6. Optional extras and their charges.
7. Normal and rush lead time.
8. Artwork/proof requirements.
9. Machine/size restrictions.
10. Whether online, walk-in, marketer, and employee prices differ.

## 23. Immediate Next Sprint

The next sprint should implement Phase 0 and the first vertical slice of Phase 1:

1. Create `packages/domain`, `packages/database`, `packages/contracts`, and `packages/pricing-engine`.
2. Replace the current inline entities with migrated, version-ready schemas.
3. Add a baseline migration and disable production synchronization.
4. Implement the large-format calculator as a pure, fully tested plugin.
5. Import the 13 supplied rates as the first published pricing version.
6. Add estimate persistence with input/rule snapshots.
7. Add admin rate editing, test calculation, draft, and publish controls.
8. Preserve current tracking and catalogue behaviour while the foundation changes.
9. Add the skeletons for `apps/operations`, `apps/operations-api`, `apps/admin-api`, and `apps/worker` to make ownership explicit.
10. Update Docker Compose and reverse-proxy routes for all local applications.

After that sprint, the team can build the customer order configurator and Operations App against stable contracts without reworking the pricing core.


## Implementation progress — 13 September 2026

Completed Phase 4 slice: customer-visible versus internal production notes.

- Job internal notes and activity notes remain staff-only. Stage notifications and customer tracking history use public status text.
- Saving an assignment, due date, or note without a stage change does not change the order status or notify the customer. Repeating the same stage does not repeat the customer update.
- Job edits, staff activity, and associated order/history changes commit in one transaction, with row locks. Notifications run after commit.
- The operations editor labels both note fields as staff-only and preserves intentional empty notes.
- Regression command: `npm run test:operations`. Service tests cover visibility, assignment-only changes, repeated stage saves, note clearing, and rollback on audit failure using a transaction test double.

Operational limits: this change prevents future production-note exposure; it does not rewrite existing history or recall previously sent notifications. Notification delivery still uses the existing service; durable retries and atomic outbox scheduling remain worker work. PostgreSQL concurrency verification and the remaining Phase 4 features (including RBAC and controlled transitions) are still outstanding.

## Implementation progress — 14 September 2026

Completed Phase 4 slice: controlled production-job stage transitions.

- The API validates the requested stage against the locked job before any write. Invalid jumps leave job, audit, history, and notifications unchanged.
- Normal progression is intake → artwork review → proofing (when needed) → production ready → in production → quality check → ready → fulfilled. Artwork review may proceed directly to production ready for work not requiring a proof.
- Proofing may return to artwork review; production ready may return to artwork review; QC may return to production; ready may return to QC.
- Active jobs may be blocked or cancelled. Blocked jobs restart at artwork review or are cancelled. Fulfilled and cancelled stages are terminal, while staff-only metadata remains editable.
- The job list supplies allowed stages to the editor. Cancelled jobs remain visible on the board; failed saves display an error and permit retry.
- Validation: `npm run test:operations` passes 21 tests, including transition rejection, allowed progression/rework, terminal edits, rollback, visibility, and API stage choices. `npm run build -w @vikipat/admin` passes.

Limits: these are production-job transition controls, not proof approval, QC checklist, payment, or role permission enforcement. The legacy order-status editor remains independent; aggregate status across multiple jobs, PostgreSQL concurrency verification, RBAC, and durable notifications remain outstanding. Browser interaction testing was not performed for this slice.

Next Phase 4 slice: operations staff authentication/RBAC and permission checks for job release, stage changes, assignments, and notes.

## Implementation progress — 15 September 2026

Completed Phase 4 slice: initial operations staff authentication and role permissions.

- Existing administrators retain full access. Five fixed operational roles are available: operations supervisor, designer, production operator, quality control, and dispatch. Permission names and role mappings live in `packages/domain`.
- Administrators can create staff accounts, change operational roles, and deactivate/reactivate accounts through **Staff access**. New staff must replace their temporary password at first login. No invitation email is sent; the administrator shares the temporary password directly. Staff management cannot create, demote, or deactivate administrators, or alter the caller's own access.
- Authentication checks the current database role, activation state, and token version on every authenticated request. Role/activation changes revoke existing sessions. Staff-account changes and their audit records commit together; passwords and hashes are excluded from staff responses and audit details.
- All operational roles can read the production board/activity and add internal notes. Supervisors may release jobs, assign people/due dates, and manage all currently permitted transitions. Designers handle artwork/proofing, operators handle production, QC handles checks/rework, and dispatch handles ready/fulfilled work. Only supervisors/admins can cancel or recover blocked jobs.
- Stage and assignment permissions are checked against the locked job before writes. Server-provided stage options include only transitions allowed for the current role. The editor disables restricted metadata fields and omits them from specialist updates.
- Finance, pricing, catalogue, settings, staff management, the full order list, order creation, and legacy order-status mutation remain administrator-only. Supervisors use a limited production-intake endpoint. Staff land directly in Operations and do not load admin datasets.
- Migration `1720000004000-StaffAccessSchema` adds the activation flag while preserving existing active accounts. Its down migration revokes sessions before removing the flag.
- Validation: 39 operations/security unit tests and 6 isolated PostgreSQL/real HTTP tests pass, covering migration, route isolation, creation/validation, password change, assignment restrictions, session revocation, and deactivation; full monorepo build. Browser checks with API fixtures cover staff creation/role editing, mobile layout, specialist metadata restrictions, visible save errors, and retry.

Limits: this is the initial fixed-role implementation inside the existing admin application/API. Separate operations applications, configurable roles, sales/front-desk/estimator roles, assigned-job visibility, and MFA remain later work. All operational roles currently see the entire production board. Assignment remains a staff-name field. Existing payment/job-release concurrency, aggregate order status, proof approval, QC evidence, and durable notification concerns remain outstanding. No production deployment was performed.

Next Phase 4 slice: transactional, idempotent production release shared by staff release and payment confirmation, with PostgreSQL concurrency tests and per-job release audit records.
