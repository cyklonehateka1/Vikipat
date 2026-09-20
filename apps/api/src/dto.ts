import { ArrayMaxSize, ArrayMinSize, IsBoolean, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUrl, IsUUID, Length, Matches, Max, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CATEGORIES } from './catalog.seed';
export class LoginDto { @IsEmail() email!:string; @IsString() @MinLength(8) password!:string; }
export class ChangePasswordDto { @IsString() currentPassword!:string; @IsString() @MinLength(12) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,{message:'Password must include upper, lower, number and symbol'}) newPassword!:string; }
export class CreateProductDto { @IsString() @Length(2,120) name!:string; @IsIn(CATEGORIES) category!:string; @IsNumber() @Min(.01) @Max(1000000) price!:number; @IsString() @Length(1,40) unit!:string; @IsString() @Length(1,1000) description!:string; @IsOptional() @IsUrl({require_protocol:true}) image?:string; @IsInt() @Min(0) @Max(1000000) stock!:number; @IsOptional() @IsIn(['Active','Draft']) status?:'Active'|'Draft'; @IsOptional() @IsBoolean() featured?:boolean; }
export class UpdateProductDto { @IsOptional() @IsString() @Length(2,120) name?:string; @IsOptional() @IsIn(CATEGORIES) category?:string; @IsOptional() @IsNumber() @Min(.01) @Max(1000000) price?:number; @IsOptional() @IsString() @Length(1,40) unit?:string; @IsOptional() @IsString() @Length(1,1000) description?:string; @IsOptional() @IsUrl({require_protocol:true}) image?:string; @IsOptional() @IsInt() @Min(0) @Max(1000000) stock?:number; @IsOptional() @IsIn(['Active','Draft']) status?:'Active'|'Draft'; @IsOptional() @IsBoolean() featured?:boolean; }
export class AdjustStockDto { @IsInt() @Min(0) @Max(1000000) stock!:number; @IsString() @Length(3,160) reason!:string; }
export class UpdateSettingsDto { @IsString() @Length(2,100) businessName!:string; @IsString() @Matches(/^[+0-9 ()-]{8,24}$/) phone!:string; @IsString() @Length(2,150) location!:string; @IsIn(['GHS']) currency!:string; @IsString() @Length(10,500) description!:string; @IsOptional() @IsBoolean() whatsappNotificationsEnabled?:boolean; @IsOptional() @IsString() @Matches(/^\d{10,15}$/) whatsappBusinessNumber?:string; }
export class CreateQuoteDto { @IsString() @Length(2,120) name!:string; @IsOptional() @IsString() @Length(0,120) company?:string; @IsString() @Matches(/^[+0-9 ()-]{8,24}$/) phone!:string; @IsOptional() @IsEmail() email?:string; @IsIn(CATEGORIES) need!:string; @IsString() @Length(1,80) quantity!:string; @IsOptional() @IsString() @Length(0,80) size?:string; @IsOptional() @IsString() @Length(0,100) material?:string; @IsOptional() @IsString() @Length(0,40) deadline?:string; @IsOptional() @IsString() @Length(0,180) location?:string; @IsOptional() @IsUrl({require_protocol:true}) artworkUrl?:string; @IsOptional() @IsString() @Length(0,180) artworkName?:string; @IsOptional() @IsString() @Length(0,2000) message?:string; @IsOptional() @IsString() @Length(0,0) website?:string; }
export class UpdateQuoteStatusDto { @IsIn(['New','Contacted','Quoted','Won','Closed']) status!:'New'|'Contacted'|'Quoted'|'Won'|'Closed'; }

export class LargeFormatEstimateDto {
  @IsString() @Length(2,80) serviceCode!: string;
  @IsOptional() @IsString() @Matches(/^EST-[A-Z0-9]{12}$/) estimateId?: string;
  @IsOptional() @IsString() @Length(20,200) fingerprint?: string;
  @IsNumber() @Min(0.1) @Max(10000) width!: number;
  @IsNumber() @Min(0.1) @Max(10000) height!: number;
  @IsIn(['ft','in']) unit!: 'ft'|'in';
  @IsInt() @Min(1) @Max(100000) quantity!: number;
  @IsOptional() @IsIn(['online','walk_in','marketer','employee']) priceBook?: 'online'|'walk_in'|'marketer'|'employee';
  @IsOptional() @IsBoolean() needsDesign?: boolean;
  @IsOptional() @IsInt() @Min(10000) @Max(100000000) designFeePesewas?: number;
}

export class OrderLineItemDto {
  @IsIn(['large_format','product']) type!: 'large_format'|'product';

  // large_format fields — price is always computed server-side from the
  // live rate table at order time (see OrderService.estimate), never from
  // anything the client sends. estimateId/fingerprint are optional and, if
  // present, are only a light sanity check (see assertEstimateMatches) —
  // per-sq-ft rates change rarely enough that requiring a fresh quote on
  // every checkout isn't worth the friction.
  @ValidateIf(o => o.type === 'large_format') @IsString() @Length(2,80) serviceCode?: string;
  @IsOptional() @IsString() @Matches(/^EST-[A-Z0-9]{12}$/) estimateId?: string;
  @IsOptional() @IsString() @Length(20,200) fingerprint?: string;
  @ValidateIf(o => o.type === 'large_format') @IsNumber() @Min(0.1) @Max(10000) width?: number;
  @ValidateIf(o => o.type === 'large_format') @IsNumber() @Min(0.1) @Max(10000) height?: number;
  @ValidateIf(o => o.type === 'large_format') @IsIn(['ft','in']) unit?: 'ft'|'in';
  @IsOptional() @IsBoolean() needsDesign?: boolean;
  @IsOptional() @IsInt() @Min(10000) @Max(100000000) designFeePesewas?: number;

  // product fields
  @ValidateIf(o => o.type === 'product') @IsUUID() productId?: string;

  // shared
  @IsInt() @Min(1) @Max(100000) quantity!: number;
}

export class CreateGuestOrderDto {
  @IsString() @Length(2,120) customerName!: string;
  @IsEmail() customerEmail!: string;
  @IsOptional() @IsString() @Matches(/^[+0-9 ()-]{8,24}$/) customerPhone?: string;
  @IsOptional() @IsIn(['online','walk_in','salesperson']) source?: 'online'|'walk_in'|'salesperson';
  @ValidateNested({ each: true }) @Type(() => OrderLineItemDto) @ArrayMinSize(1) @ArrayMaxSize(30) items!: OrderLineItemDto[];
  @IsOptional() @IsString() @Length(0,1000) customerNote?: string;
  @IsOptional() @IsString() @Length(0,80) fulfilmentMethod?: string;
  @IsOptional() @IsString() @Length(0,250) deliveryAddress?: string;
  @IsOptional() @IsString() @Length(0,120) deliveryLandmark?: string;
  @IsOptional() @IsString() @Length(0,40) requestedDate?: string;
  @IsOptional() @IsString() @Length(0,500) artworkUrl?: string;
  @IsOptional() @IsString() @Length(0,180) artworkName?: string;
  @IsOptional() @IsString() @Length(0,500) artworkLink?: string;
  @IsOptional() @IsIn(['upload','link','design_service','later']) artworkOption?: 'upload'|'link'|'design_service'|'later';
  @IsOptional() @IsString() @Length(0,0) website?: string;
}

export class RequestTrackingOtpDto {
  @IsString() @Matches(/^VP-[A-Z0-9]{8}$/) orderNumber!: string;
  @IsEmail() email!: string;
}

export class VerifyTrackingOtpDto extends RequestTrackingOtpDto {
  @IsString() @Matches(/^\d{6}$/) code!: string;
}

export const ORDER_STATUSES=['pending_review','awaiting_payment','paid','artwork_review','awaiting_proof','ready_for_production','in_production','quality_check','ready','out_for_delivery','completed','on_hold','cancelled'] as const;
export const PRODUCTION_STAGES=['intake','artwork_review','proofing','production_ready','in_production','quality_check','ready','fulfilled','blocked','cancelled'] as const;
export class UpdateOrderStatusDto {
  @IsIn(ORDER_STATUSES) status!: typeof ORDER_STATUSES[number];
  @IsOptional() @IsString() @Length(0,500) note?: string;
  @IsOptional() @IsBoolean() customerVisible?: boolean;
}

export class UpdateProductionJobDto {
  @IsIn(PRODUCTION_STAGES) stage!: typeof PRODUCTION_STAGES[number];
  @IsOptional() @IsString() @Length(0,120) assignedTo?: string;
  @IsOptional() @IsString() @Length(0,40) dueDate?: string;
  @IsOptional() @IsString() @Length(0,500) internalNote?: string;
}

export class AddProductionJobNoteDto {
  @IsString() @Length(1,1000) note!: string;
}

export class SavePricingDraftDto {
  @IsInt() @Min(0) @Max(100000000) employeeRatePesewas!: number;
  @IsInt() @Min(0) @Max(100000000) marketerRatePesewas!: number;
  @IsInt() @Min(0) @Max(100000000) walkInRatePesewas!: number;
  @IsInt() @Min(0) @Max(100000000) onlineRatePesewas!: number;
  @IsInt() @Min(10000) @Max(100000000) designMinimumPesewas!: number;
  @IsIn(['nearest_cedi','up_to_cedi','exact_pesewa']) roundingMode!: 'nearest_cedi'|'up_to_cedi'|'exact_pesewa';
  @IsString() @Length(3,300) changeNote!: string;
}

export class UpdatePricingCopyDto {
  @IsOptional() @IsIn(['banner','sticker','board','fabric','finish']) category?: 'banner'|'sticker'|'board'|'fabric'|'finish';
  @IsOptional() @IsString() @Length(0,600) description?: string;
  @IsOptional() @IsString() @Length(0,300) typicalUses?: string;
  @IsOptional() @IsString() @Length(0,40) badge?: string;
  @IsOptional() @IsString() @Length(0,300) outcomes?: string;
  @IsOptional() @IsUrl({require_protocol:true}) imageUrl?: string;
  @IsOptional() @IsInt() @Min(0) @Max(1000) sortOrder?: number;
}

export class TestPricingDraftDto {
  @IsNumber() @Min(0.1) @Max(10000) width!: number;
  @IsNumber() @Min(0.1) @Max(10000) height!: number;
  @IsIn(['ft','in']) unit!: 'ft'|'in';
  @IsInt() @Min(1) @Max(100000) quantity!: number;
  @IsIn(['online','walk_in','marketer','employee']) priceBook!: 'online'|'walk_in'|'marketer'|'employee';
  @IsOptional() @IsBoolean() needsDesign?: boolean;
  @IsOptional() @IsInt() @Min(10000) @Max(100000000) confirmedDesignFeePesewas?: number;
}
