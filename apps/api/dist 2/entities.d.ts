export declare class User {
    id: string;
    email: string;
    passwordHash: string;
    mustChangePassword: boolean;
    name: string;
    role: string;
    tokenVersion: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare class Product {
    id: string;
    name: string;
    category: string;
    price: number;
    unit: string;
    description: string;
    image: string;
    stock: number;
    status: 'Active' | 'Draft';
    featured: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare class StockActivity {
    id: string;
    productId: string;
    productName: string;
    previousStock: number;
    newStock: number;
    reason: string;
    actorEmail: string;
    createdAt: Date;
}
export declare class StoreSettings {
    id: string;
    businessName: string;
    phone: string;
    location: string;
    currency: string;
    description: string;
    whatsappNotificationsEnabled: boolean;
    whatsappBusinessNumber: string;
    updatedAt: Date;
}
export declare class AuditLog {
    id: string;
    action: string;
    entity: string;
    entityId: string;
    actorEmail: string;
    details: string;
    createdAt: Date;
}
export declare class QuoteRequest {
    id: string;
    name: string;
    company: string;
    phone: string;
    email: string;
    need: string;
    quantity: string;
    size: string;
    material: string;
    deadline: string;
    location: string;
    artworkUrl: string;
    artworkName: string;
    message: string;
    status: 'New' | 'Contacted' | 'Quoted' | 'Won' | 'Closed';
    createdAt: Date;
    updatedAt: Date;
}
export type OrderSource = 'online' | 'walk_in' | 'salesperson';
export type OrderStatus = 'pending_review' | 'awaiting_payment' | 'paid' | 'artwork_review' | 'awaiting_proof' | 'ready_for_production' | 'in_production' | 'quality_check' | 'ready' | 'out_for_delivery' | 'completed' | 'on_hold' | 'cancelled';
export type ProductionStage = 'intake' | 'artwork_review' | 'proofing' | 'production_ready' | 'in_production' | 'quality_check' | 'ready' | 'fulfilled' | 'blocked' | 'cancelled';
export declare class ServicePriceRule {
    id: string;
    code: string;
    name: string;
    material: string;
    calculator: string;
    employeeRatePesewas: number;
    marketerRatePesewas: number;
    walkInRatePesewas: number;
    onlineRatePesewas: number;
    version: number;
    designMinimumPesewas: number;
    roundingMode: 'nearest_cedi' | 'up_to_cedi' | 'exact_pesewa';
    active: boolean;
    updatedAt: Date;
}
export declare class ServicePriceRuleVersion {
    id: string;
    ruleId: string;
    code: string;
    name: string;
    material: string;
    calculator: string;
    version: number;
    employeeRatePesewas: number;
    marketerRatePesewas: number;
    walkInRatePesewas: number;
    onlineRatePesewas: number;
    designMinimumPesewas: number;
    roundingMode: string;
    publishedBy: string;
    publishedAt: Date;
}
export declare class PricingRuleDraft {
    id: string;
    ruleId: string;
    code: string;
    name: string;
    material: string;
    calculator: string;
    baseVersion: number;
    employeeRatePesewas: number;
    marketerRatePesewas: number;
    walkInRatePesewas: number;
    onlineRatePesewas: number;
    designMinimumPesewas: number;
    roundingMode: string;
    status: 'draft' | 'published' | 'superseded';
    createdBy: string;
    updatedBy: string;
    changeNote: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class Estimate {
    id: string;
    publicId: string;
    calculator: string;
    disposition: 'final' | 'provisional' | 'manual_review' | 'invalid';
    serviceCode: string;
    ruleVersion: number;
    priceBook: string;
    subtotalPesewas: number;
    designFeePesewas: number;
    totalPesewas: number;
    currency: string;
    fingerprint: string;
    inputSnapshot: string;
    calculationSnapshot: string;
    expiresAt: Date;
    createdAt: Date;
}
export declare class Order {
    id: string;
    orderNumber: string;
    source: OrderSource;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    status: OrderStatus;
    paymentStatus: 'unpaid' | 'pending' | 'paid' | 'part_paid' | 'refunded';
    paymentProvider: string;
    paymentReference: string;
    subtotalPesewas: number;
    designFeePesewas: number;
    totalPesewas: number;
    requiresReview: boolean;
    promisedDate: string;
    customerNote: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class PaymentTransaction {
    id: string;
    orderId: string;
    orderNumber: string;
    provider: 'paystack';
    reference: string;
    amountPesewas: number;
    currency: 'GHS';
    status: 'initialized' | 'pending' | 'paid' | 'failed' | 'abandoned' | 'refunded';
    authorizationUrl: string;
    accessCode: string;
    providerResponse: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class OrderItem {
    id: string;
    orderId: string;
    serviceCode: string;
    name: string;
    quantity: number;
    unitPricePesewas: number;
    totalPesewas: number;
    specification: string;
}
export declare class ProductionJob {
    id: string;
    orderId: string;
    orderItemId: string;
    orderNumber: string;
    jobNumber: string;
    customerName: string;
    serviceCode: string;
    title: string;
    quantity: number;
    stage: ProductionStage;
    priority: 'low' | 'normal' | 'rush';
    assignedTo: string;
    dueDate: string;
    specification: string;
    internalNote: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class ProductionJobActivity {
    id: string;
    jobId: string;
    orderId: string;
    jobNumber: string;
    type: 'note' | 'stage_change' | 'assignment' | 'system';
    fromStage: string;
    toStage: string;
    note: string;
    actor: string;
    createdAt: Date;
}
export declare class OrderStatusHistory {
    id: string;
    orderId: string;
    status: OrderStatus;
    note: string;
    actor: string;
    customerVisible: boolean;
    createdAt: Date;
}
export declare class OrderTrackingOtp {
    id: string;
    orderId: string;
    emailHash: string;
    codeHash: string;
    expiresAt: Date;
    attempts: number;
    consumed: boolean;
    createdAt: Date;
}
export declare class NotificationOutbox {
    id: string;
    orderId: string;
    channel: 'email' | 'whatsapp';
    recipient: string;
    template: string;
    payload: string;
    status: 'pending' | 'sent' | 'failed' | 'skipped';
    attempts: number;
    lastError: string;
    createdAt: Date;
    updatedAt: Date;
}
