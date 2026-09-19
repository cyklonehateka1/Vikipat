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

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) orderNumber!: string;
  @Column({ default: 'online' }) source!: OrderSource;
  @Column() customerName!: string;
  @Column() customerEmail!: string;
  @Column({ default: '' }) customerPhone!: string;
  @Column({ default: 'pending_review' }) status!: OrderStatus;
  @Column({ default: 'unpaid' }) paymentStatus!: 'unpaid'|'pending'|'paid'|'part_paid'|'refunded';
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
  @Column() provider!: 'paystack';
  @Column({ unique: true }) reference!: string;
  @Column('integer') amountPesewas!: number;
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
  @Column({ default: 'large_format' }) kind!: 'large_format' | 'product';
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
  @Column({ default: 'pending' }) status!: 'pending'|'sent'|'failed'|'skipped';
  @Column('integer',{ default: 0 }) attempts!: number;
  @Column({ default: '' }) lastError!: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
