export declare class LoginDto {
    email: string;
    password: string;
}
export declare class ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}
export declare class CreateProductDto {
    name: string;
    category: string;
    price: number;
    unit: string;
    description: string;
    image?: string;
    stock: number;
    status?: 'Active' | 'Draft';
    featured?: boolean;
}
export declare class UpdateProductDto {
    name?: string;
    category?: string;
    price?: number;
    unit?: string;
    description?: string;
    image?: string;
    stock?: number;
    status?: 'Active' | 'Draft';
    featured?: boolean;
}
export declare class AdjustStockDto {
    stock: number;
    reason: string;
}
export declare class UpdateSettingsDto {
    businessName: string;
    phone: string;
    location: string;
    currency: string;
    description: string;
    whatsappNotificationsEnabled?: boolean;
    whatsappBusinessNumber?: string;
}
export declare class CreateQuoteDto {
    name: string;
    company?: string;
    phone: string;
    email?: string;
    need: string;
    quantity: string;
    size?: string;
    material?: string;
    deadline?: string;
    location?: string;
    artworkUrl?: string;
    artworkName?: string;
    message?: string;
    website?: string;
}
export declare class UpdateQuoteStatusDto {
    status: 'New' | 'Contacted' | 'Quoted' | 'Won' | 'Closed';
}
export declare class LargeFormatEstimateDto {
    serviceCode: string;
    estimateId?: string;
    fingerprint?: string;
    width: number;
    height: number;
    unit: 'ft' | 'in';
    quantity: number;
    priceBook?: 'online' | 'walk_in' | 'marketer' | 'employee';
    needsDesign?: boolean;
    designFeePesewas?: number;
}
export declare class CreateGuestOrderDto {
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    source?: 'online' | 'walk_in' | 'salesperson';
    item: LargeFormatEstimateDto;
    customerNote?: string;
    fulfilmentMethod?: string;
    deliveryAddress?: string;
    deliveryLandmark?: string;
    requestedDate?: string;
    artworkUrl?: string;
    artworkName?: string;
    artworkLink?: string;
    artworkOption?: 'upload' | 'link' | 'design_service' | 'later';
    website?: string;
}
export declare class RequestTrackingOtpDto {
    orderNumber: string;
    email: string;
}
export declare class VerifyTrackingOtpDto extends RequestTrackingOtpDto {
    code: string;
}
export declare const ORDER_STATUSES: readonly ["pending_review", "awaiting_payment", "paid", "artwork_review", "awaiting_proof", "ready_for_production", "in_production", "quality_check", "ready", "out_for_delivery", "completed", "on_hold", "cancelled"];
export declare const PRODUCTION_STAGES: readonly ["intake", "artwork_review", "proofing", "production_ready", "in_production", "quality_check", "ready", "fulfilled", "blocked", "cancelled"];
export declare class UpdateOrderStatusDto {
    status: typeof ORDER_STATUSES[number];
    note?: string;
    customerVisible?: boolean;
}
export declare class UpdateProductionJobDto {
    stage: typeof PRODUCTION_STAGES[number];
    assignedTo?: string;
    dueDate?: string;
    internalNote?: string;
}
export declare class AddProductionJobNoteDto {
    note: string;
}
export declare class SavePricingDraftDto {
    employeeRatePesewas: number;
    marketerRatePesewas: number;
    walkInRatePesewas: number;
    onlineRatePesewas: number;
    designMinimumPesewas: number;
    roundingMode: 'nearest_cedi' | 'up_to_cedi' | 'exact_pesewa';
    changeNote: string;
}
export declare class TestPricingDraftDto {
    width: number;
    height: number;
    unit: 'ft' | 'in';
    quantity: number;
    priceBook: 'online' | 'walk_in' | 'marketer' | 'employee';
    needsDesign?: boolean;
    confirmedDesignFeePesewas?: number;
}
