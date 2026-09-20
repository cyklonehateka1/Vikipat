import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
@Entity('users') export class User { @PrimaryGeneratedColumn('uuid') id!:string; @Column({unique:true}) email!:string; @Column() passwordHash!:string; @Column({default:true}) mustChangePassword!:boolean; @Column({default:'Admin'}) name!:string; @Column({default:'admin'}) role!:string; @Column({default:0}) tokenVersion!:number; @Column({default:true}) isActive!:boolean; @CreateDateColumn() createdAt!:Date; @UpdateDateColumn() updatedAt!:Date; }
@Entity('products') export class Product { @PrimaryGeneratedColumn('uuid') id!:string; @Column() name!:string; @Column() category!:string; @Column('real') price!:number; @Column({default:'item'}) unit!:string; @Column({default:''}) description!:string; @Column({default:''}) image!:string; @Column('integer',{default:0}) stock!:number; @Column({default:'Active'}) status!:'Active'|'Draft'; @Column({default:false}) featured!:boolean; @CreateDateColumn() createdAt!:Date; @UpdateDateColumn() updatedAt!:Date; }
@Entity('stock_activity') export class StockActivity { @PrimaryGeneratedColumn('uuid') id!:string; @Column() productId!:string; @Column() productName!:string; @Column('integer') previousStock!:number; @Column('integer') newStock!:number; @Column() reason!:string; @Column() actorEmail!:string; @CreateDateColumn() createdAt!:Date; }
@Entity('store_settings') export class StoreSettings { @PrimaryGeneratedColumn('uuid') id!:string; @Column({default:'Vikipat'}) businessName!:string; @Column({default:'024 236 6523'}) phone!:string; @Column({default:'Mallam–Gbawe Road, opposite Zen Filling Station, Accra'}) location!:string; @Column({default:'GHS'}) currency!:string; @Column({default:'Printing press and branding solutions for businesses, events and everyday people.'}) description!:string; @Column({default:false}) whatsappNotificationsEnabled!:boolean; @Column({default:'233555110844'}) whatsappBusinessNumber!:string; @UpdateDateColumn() updatedAt!:Date; }
@Entity('audit_log') export class AuditLog { @PrimaryGeneratedColumn('uuid') id!:string; @Column() action!:string; @Column() entity!:string; @Column({default:''}) entityId!:string; @Column() actorEmail!:string; @Column({type:'text',default:'{}'}) details!:string; @CreateDateColumn() createdAt!:Date; }
@Entity('quote_requests') export class QuoteRequest { @PrimaryGeneratedColumn('uuid') id!:string; @Column() name!:string; @Column({default:''}) company!:string; @Column() phone!:string; @Column({default:''}) email!:string; @Column() need!:string; @Column() quantity!:string; @Column({default:''}) size!:string; @Column({default:''}) material!:string; @Column({default:''}) deadline!:string; @Column({default:''}) location!:string; @Column({default:''}) artworkUrl!:string; @Column({default:''}) artworkName!:string; @Column({type:'text',default:''}) message!:string; @Column({default:'New'}) status!:'New'|'Contacted'|'Quoted'|'Won'|'Closed'; @CreateDateColumn() createdAt!:Date; @UpdateDateColumn() updatedAt!:Date; }

export type OrderSource = 'online' | 'walk_in' | 'salesperson';
export type OrderStatus = 'pending_review' | 'awaiting_payment' | 'paid' | 'artwork_review' | 'awaiting_proof' | 'ready_for_production' | 'in_production' | 'quality_check' | 'ready' | 'out_for_delivery' | 'completed' | 'on_hold' | 'cancelled';
export type ProductionStage = 'intake' | 'artwork_review' | 'proofing' | 'production_ready' | 'in_production' | 'quality_check' | 'ready' | 'fulfilled' | 'blocked' | 'cancelled';

@Entity('service_price_rules')
export class ServicePriceRule {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) code!: string;
  @Column() name!: string;
  @Column() material!: string;
  @Column({ default: 'large_format_area' }) calculator!: string;
  @Column('integer') employeeRatePesewas!: number;
  @Column('integer') marketerRatePesewas!: number;
  @Column('integer') walkInRatePesewas!: number;
  @Column('integer') onlineRatePesewas!: number;
  @Column('integer',{ default: 1 }) version!: number;
  @Column('integer',{ default: 10000 }) designMinimumPesewas!: number;
  @Column({ default: 'nearest_cedi' }) roundingMode!: 'nearest_cedi'|'up_to_cedi'|'exact_pesewa';
  @Column({ default: true }) active!: boolean;
  @Column({ default: 'finish' }) category!: 'banner'|'sticker'|'board'|'fabric'|'finish';
  @Column({ type: 'text', default: '' }) description!: string;
  @Column({ type: 'text', default: '' }) typicalUses!: string;
  @Column({ default: '' }) badge!: string;
  @Column({ type: 'text', default: '' }) outcomes!: string; // comma-separated outcome slugs, e.g. "shop-signage,events"
  @Column({ default: '' }) imageUrl!: string;
  @Column('integer', { default: 0 }) sortOrder!: number;
  @UpdateDateColumn() updatedAt!: Date;
}

@Entity('service_price_rule_versions')
export class ServicePriceRuleVersion {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() ruleId!: string;
  @Column() code!: string;
  @Column() name!: string;
  @Column() material!: string;
  @Column() calculator!: string;
  @Column('integer') version!: number;
  @Column('integer') employeeRatePesewas!: number;
  @Column('integer') marketerRatePesewas!: number;
  @Column('integer') walkInRatePesewas!: number;
  @Column('integer') onlineRatePesewas!: number;
  @Column('integer') designMinimumPesewas!: number;
  @Column() roundingMode!: string;
  @Column() publishedBy!: string;
  @CreateDateColumn() publishedAt!: Date;
}

@Entity('pricing_rule_drafts')
export class PricingRuleDraft {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() ruleId!: string;
  @Column() code!: string;
  @Column() name!: string;
  @Column() material!: string;
  @Column() calculator!: string;
  @Column('integer') baseVersion!: number;
  @Column('integer') employeeRatePesewas!: number;
  @Column('integer') marketerRatePesewas!: number;
  @Column('integer') walkInRatePesewas!: number;
  @Column('integer') onlineRatePesewas!: number;
  @Column('integer') designMinimumPesewas!: number;
  @Column({ default: 'nearest_cedi' }) roundingMode!: string;
  @Column({ default: 'draft' }) status!: 'draft'|'published'|'superseded';
  @Column() createdBy!: string;
  @Column() updatedBy!: string;
  @Column({ default: '' }) changeNote!: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}

@Entity('estimates')
export class Estimate {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) publicId!: string;
  @Column() calculator!: string;
  @Column() disposition!: 'final'|'provisional'|'manual_review'|'invalid';
  @Column() serviceCode!: string;
  @Column('integer') ruleVersion!: number;
  @Column() priceBook!: string;
  @Column('integer') subtotalPesewas!: number;
  @Column('integer') designFeePesewas!: number;
  @Column('integer') totalPesewas!: number;
  @Column() currency!: string;
  @Column() fingerprint!: string;
  @Column({ type: 'text' }) inputSnapshot!: string;
  @Column({ type: 'text' }) calculationSnapshot!: string;
  @Column() expiresAt!: Date;
  @CreateDateColumn() createdAt!: Date;
}

/**
 * A customer is identified by email, which is the stable key across guest
 * orders. Checkout stays guest-only; this record is derived from the orders
 * themselves so repeat buyers roll up into one profile for reporting, and so
 * customer logins can be added later without re-modelling anything.
 */
@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid') id!: string;
  /** Null for a walk-in identified only by phone; several may coexist. */
  @Index() @Column({ type: 'varchar', unique: true, nullable: true }) email!: string | null;
  @Column({ default: '' }) name!: string;
  @Column({ default: '' }) company!: string;
  /** Canonical phone keys, comma-delimited on both sides for exact LIKE lookup. */
  @Index() @Column({ type: 'text', default: '' }) phoneIndex!: string;
  /** Every distinct phone number seen on this customer's orders, newest first. */
  @Column({ type: 'text', default: '[]' }) phones!: string;
  @Column('integer', { default: 0 }) orderCount!: number;
  @Column('integer', { default: 0 }) lifetimeValuePesewas!: number;
  @Column({ type: Date, nullable: true }) firstOrderAt!: Date | null;
  @Column({ type: Date, nullable: true }) lastOrderAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) orderNumber!: string;
  @Column({type: 'varchar', nullable: true, unique: true}) requestKey!: string | null;
  @Column({default: ''}) salesperson!: string;
  @Column('integer', {default: 0}) deliveryFeePesewas!: number;
  @Column({ default: 'online' }) source!: OrderSource;
  @Index() @Column({ default: '' }) customerId!: string;
  @Column() customerName!: string;
  @Column() customerEmail!: string;
  @Column({ default: '' }) customerPhone!: string;
  @Column({ default: 'pending_review' }) status!: OrderStatus;
  @Column({ default: 'unpaid' }) paymentStatus!: 'unpaid'|'pending'|'paid'|'part_paid'|'part_refunded'|'refunded';
  @Column('integer', { default: 0 }) refundedPesewas!: number;
  @Column({ type: 'text', default: '' }) refundReason!: string;
  @Column({ type: Date, nullable: true }) refundedAt!: Date | null;
  @Column({ default: '' }) refundedBy!: string;
  @Column({ default: '' }) paymentProvider!: string;
  @Column({ default: '' }) paymentReference!: string;
  @Column('integer',{ default: 0 }) subtotalPesewas!: number;
  @Column('integer',{ default: 0 }) designFeePesewas!: number;
  @Column('integer',{ default: 0 }) totalPesewas!: number;
  @Column({ default: false }) requiresReview!: boolean;
  @Column({ default: '' }) promisedDate!: string;
  @Column({ type: 'text', default: '' }) customerNote!: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() orderId!: string;
  @Column() orderNumber!: string;
  @Column() provider!: 'paystack'|'cash'|'momo'|'bank_transfer';
  @Column({ unique: true }) reference!: string;
  @Column('integer') amountPesewas!: number;
  @Column({type: Date, nullable: true}) paidAt!: Date | null;
  @Column({default: ''}) recordedBy!: string;
  @Column({default: ''}) externalReference!: string;
  @Column() currency!: 'GHS';
  @Column({ default: 'initialized' }) status!: 'initialized'|'pending'|'paid'|'failed'|'abandoned'|'refunded';
  @Column({ default: '' }) authorizationUrl!: string;
  @Column({ default: '' }) accessCode!: string;
  @Column({ type: 'text', default: '{}' }) providerResponse!: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column() orderId!: string;
  @Column({ default: 'large_format' }) kind!: 'large_format' | 'product' | 'custom';
  @Column({ default: '' }) productId!: string;
  @Column() serviceCode!: string;
  @Column() name!: string;
  @Column('integer') quantity!: number;
  @Column('integer') unitPricePesewas!: number;
  @Column('integer') totalPesewas!: number;
  @Column({ type: 'text' }) specification!: string;
}

@Entity('production_jobs')
@Index('idx_production_jobs_order_item_unique', ['orderItemId'], {unique: true})
export class ProductionJob {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column() orderId!: string;
  @Column() orderItemId!: string;
  @Column() orderNumber!: string;
  @Column() jobNumber!: string;
  @Column() customerName!: string;
  @Column() serviceCode!: string;
  @Column() title!: string;
  @Column('integer') quantity!: number;
  @Column({ default: 'intake' }) stage!: ProductionStage;
  @Column({ default: 'normal' }) priority!: 'low'|'normal'|'rush';
  @Column({ default: '' }) assignedTo!: string;
  @Column({ default: '' }) dueDate!: string;
  @Column({ type: 'text', default: '{}' }) specification!: string;
  @Column({ default: '' }) internalNote!: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}

@Entity('production_job_activity')
export class ProductionJobActivity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column() jobId!: string;
  @Column() orderId!: string;
  @Column() jobNumber!: string;
  @Column({ default: 'note' }) type!: 'note'|'stage_change'|'assignment'|'system';
  @Column({ default: '' }) fromStage!: string;
  @Column({ default: '' }) toStage!: string;
  @Column({ type: 'text', default: '' }) note!: string;
  @Column({ default: 'system' }) actor!: string;
  @CreateDateColumn() createdAt!: Date;
}

@Entity('order_status_history')
export class OrderStatusHistory {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column() orderId!: string;
  @Column() status!: OrderStatus;
  @Column({ default: '' }) note!: string;
  @Column({ default: 'system' }) actor!: string;
  @Column({ default: true }) customerVisible!: boolean;
  @CreateDateColumn() createdAt!: Date;
}

@Entity('order_tracking_otps')
export class OrderTrackingOtp {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column() orderId!: string;
  @Column() emailHash!: string;
  @Column() codeHash!: string;
  @Column() expiresAt!: Date;
  @Column('integer',{ default: 0 }) attempts!: number;
  @Column({ default: false }) consumed!: boolean;
  @CreateDateColumn() createdAt!: Date;
}

@Entity('notification_outbox')
export class NotificationOutbox {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() orderId!: string;
  @Column() channel!: 'email'|'whatsapp';
  @Column() recipient!: string;
  @Column() template!: string;
  @Column({ type: 'text' }) payload!: string;
  @Column({ default: 'pending' }) status!: 'pending'|'sending'|'sent'|'failed'|'skipped';
  @Column('integer',{ default: 0 }) attempts!: number;
  @Column({ default: '' }) lastError!: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}

/* ------------------------------------------------------------------
   People & payroll
   A User is a login. An Employee is the person: the one the business
   pays, schedules and measures. Not every employee needs a login (a
   press operator may never touch the admin), and not every login is
   payroll-bearing, so the two are linked rather than merged.
   ------------------------------------------------------------------ */

export type PayType = 'monthly' | 'daily' | 'hourly';
export type EmploymentStatus = 'active' | 'suspended' | 'terminated';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) staffNumber!: string;
  @Column() fullName!: string;
  @Column({ default: '' }) email!: string;
  @Column({ default: '' }) phone!: string;
  /** Links to a User row when this person also has an admin login. */
  @Index() @Column({ default: '' }) userId!: string;
  @Column({ default: '' }) jobTitle!: string;
  @Column({ default: 'production' }) department!: string;
  @Column({ default: 'active' }) employmentStatus!: EmploymentStatus;
  @Column({ default: 'monthly' }) payType!: PayType;
  /** Monthly salary, daily rate or hourly rate depending on payType. */
  @Column('integer', { default: 0 }) payRatePesewas!: number;
  @Column({ default: '' }) bankName!: string;
  @Column({ default: '' }) bankAccount!: string;
  @Column({ default: '' }) momoNumber!: string;
  @Column({ default: '' }) ssnitNumber!: string;
  @Column({ default: '' }) hiredOn!: string;
  @Column({ type: 'text', default: '' }) notes!: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}

/** One clock-in/clock-out pair. Open shifts have no clockOut yet. */
@Entity('attendance_records')
export class AttendanceRecord {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column() employeeId!: string;
  @Column() employeeName!: string;
  /** Local workday (YYYY-MM-DD) so a night shift still books to its start day. */
  @Index() @Column() workDate!: string;
  @Column({ type: Date }) clockIn!: Date;
  @Column({ type: Date, nullable: true }) clockOut!: Date | null;
  @Column('integer', { default: 0 }) minutesWorked!: number;
  @Column('integer', { default: 0 }) overtimeMinutes!: number;
  @Column({ default: 'present' }) status!: 'present'|'late'|'absent'|'leave'|'holiday';
  @Column({ type: 'text', default: '' }) note!: string;
  @Column({ default: '' }) recordedBy!: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}

/** A pay run covering a date range: draft → approved → paid. */
@Entity('payroll_runs')
export class PayrollRun {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) reference!: string;
  @Column({type:'text',default:'{}'}) policySnapshot!: string;
  @Column() periodStart!: string;
  @Column() periodEnd!: string;
  @Column({ default: 'draft' }) status!: 'draft'|'approved'|'paid'|'cancelled';
  @Column('integer', { default: 0 }) grossPesewas!: number;
  @Column('integer', { default: 0 }) deductionsPesewas!: number;
  @Column('integer', { default: 0 }) netPesewas!: number;
  @Column('integer', { default: 0 }) payslipCount!: number;
  @Column({ default: '' }) preparedBy!: string;
  @Column({ default: '' }) approvedBy!: string;
  @Column({ type: Date, nullable: true }) paidAt!: Date | null;
  @Column({ type: 'text', default: '' }) note!: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}

/** One employee's line in a pay run, with the maths kept for the record. */
@Entity('payslips')
export class Payslip {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column() payrollRunId!: string;
  @Index() @Column() employeeId!: string;
  @Column() employeeName!: string;
  @Column() staffNumber!: string;
  @Column({ default: 'monthly' }) payType!: PayType;
  @Column('integer', { default: 0 }) payRatePesewas!: number;
  @Column('integer', { default: 0 }) daysWorked!: number;
  @Column('integer', { default: 0 }) minutesWorked!: number;
  @Column('integer', { default: 0 }) overtimeMinutes!: number;
  @Column('integer', { default: 0 }) basePesewas!: number;
  @Column('integer', { default: 0 }) overtimePesewas!: number;
  @Column('integer', { default: 0 }) bonusPesewas!: number;
  @Column('integer', { default: 0 }) deductionsPesewas!: number;
  @Column('integer', { default: 0 }) grossPesewas!: number;
  @Column('integer', { default: 0 }) netPesewas!: number;
  @Column({ type: 'text', default: '' }) note!: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}

/** Single-use, short-lived password reset grant. Only the hash is stored. */
@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column() userId!: string;
  @Index() @Column() tokenHash!: string;
  @Column({ type: Date }) expiresAt!: Date;
  @Column({ type: Date, nullable: true }) usedAt!: Date | null;
  @Column({ default: '' }) requestedIp!: string;
  @CreateDateColumn() createdAt!: Date;
}

@Entity('order_refunds')
export class OrderRefund {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column() orderId!: string;
  @Column({unique: true}) requestKey!: string;
  @Column('integer') amountPesewas!: number;
  @Column() method!: string;
  @Column() externalReference!: string;
  @Column('text') reason!: string;
  @Column() recordedBy!: string;
  @Column({type: Date}) occurredAt!: Date;
  @Column('text') policySnapshot!: string;
  @Column({default: false}) cancelRemainingWork!: boolean;
  @CreateDateColumn() createdAt!: Date;
}
@Entity('business_policies')
export class BusinessPolicy {
  @Column({primary: true}) id!: string;
  @Column('text') value!: string;
  @UpdateDateColumn() updatedAt!: Date;
}
