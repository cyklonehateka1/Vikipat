"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestPricingDraftDto = exports.SavePricingDraftDto = exports.AddProductionJobNoteDto = exports.UpdateProductionJobDto = exports.UpdateOrderStatusDto = exports.PRODUCTION_STAGES = exports.ORDER_STATUSES = exports.VerifyTrackingOtpDto = exports.RequestTrackingOtpDto = exports.CreateGuestOrderDto = exports.LargeFormatEstimateDto = exports.UpdateQuoteStatusDto = exports.CreateQuoteDto = exports.UpdateSettingsDto = exports.AdjustStockDto = exports.UpdateProductDto = exports.CreateProductDto = exports.ChangePasswordDto = exports.LoginDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const catalog_seed_1 = require("./catalog.seed");
class LoginDto {
}
exports.LoginDto = LoginDto;
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
class ChangePasswordDto {
}
exports.ChangePasswordDto = ChangePasswordDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "currentPassword", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(12),
    (0, class_validator_1.Matches)(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, { message: 'Password must include upper, lower, number and symbol' }),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "newPassword", void 0);
class CreateProductDto {
}
exports.CreateProductDto = CreateProductDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(2, 120),
    __metadata("design:type", String)
], CreateProductDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsIn)(catalog_seed_1.CATEGORIES),
    __metadata("design:type", String)
], CreateProductDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(.01),
    (0, class_validator_1.Max)(1000000),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "price", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 40),
    __metadata("design:type", String)
], CreateProductDto.prototype, "unit", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 1000),
    __metadata("design:type", String)
], CreateProductDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)({ require_protocol: true }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "image", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(1000000),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "stock", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['Active', 'Draft']),
    __metadata("design:type", String)
], CreateProductDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateProductDto.prototype, "featured", void 0);
class UpdateProductDto {
}
exports.UpdateProductDto = UpdateProductDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(2, 120),
    __metadata("design:type", String)
], UpdateProductDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(catalog_seed_1.CATEGORIES),
    __metadata("design:type", String)
], UpdateProductDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(.01),
    (0, class_validator_1.Max)(1000000),
    __metadata("design:type", Number)
], UpdateProductDto.prototype, "price", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 40),
    __metadata("design:type", String)
], UpdateProductDto.prototype, "unit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 1000),
    __metadata("design:type", String)
], UpdateProductDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)({ require_protocol: true }),
    __metadata("design:type", String)
], UpdateProductDto.prototype, "image", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(1000000),
    __metadata("design:type", Number)
], UpdateProductDto.prototype, "stock", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['Active', 'Draft']),
    __metadata("design:type", String)
], UpdateProductDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateProductDto.prototype, "featured", void 0);
class AdjustStockDto {
}
exports.AdjustStockDto = AdjustStockDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(1000000),
    __metadata("design:type", Number)
], AdjustStockDto.prototype, "stock", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(3, 160),
    __metadata("design:type", String)
], AdjustStockDto.prototype, "reason", void 0);
class UpdateSettingsDto {
}
exports.UpdateSettingsDto = UpdateSettingsDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(2, 100),
    __metadata("design:type", String)
], UpdateSettingsDto.prototype, "businessName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[+0-9 ()-]{8,24}$/),
    __metadata("design:type", String)
], UpdateSettingsDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(2, 150),
    __metadata("design:type", String)
], UpdateSettingsDto.prototype, "location", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['GHS']),
    __metadata("design:type", String)
], UpdateSettingsDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(10, 500),
    __metadata("design:type", String)
], UpdateSettingsDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateSettingsDto.prototype, "whatsappNotificationsEnabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{10,15}$/),
    __metadata("design:type", String)
], UpdateSettingsDto.prototype, "whatsappBusinessNumber", void 0);
class CreateQuoteDto {
}
exports.CreateQuoteDto = CreateQuoteDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(2, 120),
    __metadata("design:type", String)
], CreateQuoteDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 120),
    __metadata("design:type", String)
], CreateQuoteDto.prototype, "company", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[+0-9 ()-]{8,24}$/),
    __metadata("design:type", String)
], CreateQuoteDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateQuoteDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsIn)(catalog_seed_1.CATEGORIES),
    __metadata("design:type", String)
], CreateQuoteDto.prototype, "need", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 80),
    __metadata("design:type", String)
], CreateQuoteDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 80),
    __metadata("design:type", String)
], CreateQuoteDto.prototype, "size", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 100),
    __metadata("design:type", String)
], CreateQuoteDto.prototype, "material", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 40),
    __metadata("design:type", String)
], CreateQuoteDto.prototype, "deadline", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 180),
    __metadata("design:type", String)
], CreateQuoteDto.prototype, "location", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)({ require_protocol: true }),
    __metadata("design:type", String)
], CreateQuoteDto.prototype, "artworkUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 180),
    __metadata("design:type", String)
], CreateQuoteDto.prototype, "artworkName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 2000),
    __metadata("design:type", String)
], CreateQuoteDto.prototype, "message", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 0),
    __metadata("design:type", String)
], CreateQuoteDto.prototype, "website", void 0);
class UpdateQuoteStatusDto {
}
exports.UpdateQuoteStatusDto = UpdateQuoteStatusDto;
__decorate([
    (0, class_validator_1.IsIn)(['New', 'Contacted', 'Quoted', 'Won', 'Closed']),
    __metadata("design:type", String)
], UpdateQuoteStatusDto.prototype, "status", void 0);
class LargeFormatEstimateDto {
}
exports.LargeFormatEstimateDto = LargeFormatEstimateDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(2, 80),
    __metadata("design:type", String)
], LargeFormatEstimateDto.prototype, "serviceCode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^EST-[A-Z0-9]{12}$/),
    __metadata("design:type", String)
], LargeFormatEstimateDto.prototype, "estimateId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(20, 200),
    __metadata("design:type", String)
], LargeFormatEstimateDto.prototype, "fingerprint", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.1),
    (0, class_validator_1.Max)(10000),
    __metadata("design:type", Number)
], LargeFormatEstimateDto.prototype, "width", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.1),
    (0, class_validator_1.Max)(10000),
    __metadata("design:type", Number)
], LargeFormatEstimateDto.prototype, "height", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['ft', 'in']),
    __metadata("design:type", String)
], LargeFormatEstimateDto.prototype, "unit", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100000),
    __metadata("design:type", Number)
], LargeFormatEstimateDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['online', 'walk_in', 'marketer', 'employee']),
    __metadata("design:type", String)
], LargeFormatEstimateDto.prototype, "priceBook", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], LargeFormatEstimateDto.prototype, "needsDesign", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(10000),
    (0, class_validator_1.Max)(100000000),
    __metadata("design:type", Number)
], LargeFormatEstimateDto.prototype, "designFeePesewas", void 0);
class CreateGuestOrderDto {
}
exports.CreateGuestOrderDto = CreateGuestOrderDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(2, 120),
    __metadata("design:type", String)
], CreateGuestOrderDto.prototype, "customerName", void 0);
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateGuestOrderDto.prototype, "customerEmail", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[+0-9 ()-]{8,24}$/),
    __metadata("design:type", String)
], CreateGuestOrderDto.prototype, "customerPhone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['online', 'walk_in', 'salesperson']),
    __metadata("design:type", String)
], CreateGuestOrderDto.prototype, "source", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => LargeFormatEstimateDto),
    __metadata("design:type", LargeFormatEstimateDto)
], CreateGuestOrderDto.prototype, "item", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 1000),
    __metadata("design:type", String)
], CreateGuestOrderDto.prototype, "customerNote", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 80),
    __metadata("design:type", String)
], CreateGuestOrderDto.prototype, "fulfilmentMethod", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 250),
    __metadata("design:type", String)
], CreateGuestOrderDto.prototype, "deliveryAddress", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 120),
    __metadata("design:type", String)
], CreateGuestOrderDto.prototype, "deliveryLandmark", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 40),
    __metadata("design:type", String)
], CreateGuestOrderDto.prototype, "requestedDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 500),
    __metadata("design:type", String)
], CreateGuestOrderDto.prototype, "artworkUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 180),
    __metadata("design:type", String)
], CreateGuestOrderDto.prototype, "artworkName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 500),
    __metadata("design:type", String)
], CreateGuestOrderDto.prototype, "artworkLink", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['upload', 'link', 'design_service', 'later']),
    __metadata("design:type", String)
], CreateGuestOrderDto.prototype, "artworkOption", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 0),
    __metadata("design:type", String)
], CreateGuestOrderDto.prototype, "website", void 0);
class RequestTrackingOtpDto {
}
exports.RequestTrackingOtpDto = RequestTrackingOtpDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^VP-[A-Z0-9]{8}$/),
    __metadata("design:type", String)
], RequestTrackingOtpDto.prototype, "orderNumber", void 0);
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], RequestTrackingOtpDto.prototype, "email", void 0);
class VerifyTrackingOtpDto extends RequestTrackingOtpDto {
}
exports.VerifyTrackingOtpDto = VerifyTrackingOtpDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{6}$/),
    __metadata("design:type", String)
], VerifyTrackingOtpDto.prototype, "code", void 0);
exports.ORDER_STATUSES = ['pending_review', 'awaiting_payment', 'paid', 'artwork_review', 'awaiting_proof', 'ready_for_production', 'in_production', 'quality_check', 'ready', 'out_for_delivery', 'completed', 'on_hold', 'cancelled'];
exports.PRODUCTION_STAGES = ['intake', 'artwork_review', 'proofing', 'production_ready', 'in_production', 'quality_check', 'ready', 'fulfilled', 'blocked', 'cancelled'];
class UpdateOrderStatusDto {
}
exports.UpdateOrderStatusDto = UpdateOrderStatusDto;
__decorate([
    (0, class_validator_1.IsIn)(exports.ORDER_STATUSES),
    __metadata("design:type", Object)
], UpdateOrderStatusDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 500),
    __metadata("design:type", String)
], UpdateOrderStatusDto.prototype, "note", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateOrderStatusDto.prototype, "customerVisible", void 0);
class UpdateProductionJobDto {
}
exports.UpdateProductionJobDto = UpdateProductionJobDto;
__decorate([
    (0, class_validator_1.IsIn)(exports.PRODUCTION_STAGES),
    __metadata("design:type", Object)
], UpdateProductionJobDto.prototype, "stage", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 120),
    __metadata("design:type", String)
], UpdateProductionJobDto.prototype, "assignedTo", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 40),
    __metadata("design:type", String)
], UpdateProductionJobDto.prototype, "dueDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 500),
    __metadata("design:type", String)
], UpdateProductionJobDto.prototype, "internalNote", void 0);
class AddProductionJobNoteDto {
}
exports.AddProductionJobNoteDto = AddProductionJobNoteDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 1000),
    __metadata("design:type", String)
], AddProductionJobNoteDto.prototype, "note", void 0);
class SavePricingDraftDto {
}
exports.SavePricingDraftDto = SavePricingDraftDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100000000),
    __metadata("design:type", Number)
], SavePricingDraftDto.prototype, "employeeRatePesewas", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100000000),
    __metadata("design:type", Number)
], SavePricingDraftDto.prototype, "marketerRatePesewas", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100000000),
    __metadata("design:type", Number)
], SavePricingDraftDto.prototype, "walkInRatePesewas", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100000000),
    __metadata("design:type", Number)
], SavePricingDraftDto.prototype, "onlineRatePesewas", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(10000),
    (0, class_validator_1.Max)(100000000),
    __metadata("design:type", Number)
], SavePricingDraftDto.prototype, "designMinimumPesewas", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['nearest_cedi', 'up_to_cedi', 'exact_pesewa']),
    __metadata("design:type", String)
], SavePricingDraftDto.prototype, "roundingMode", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(3, 300),
    __metadata("design:type", String)
], SavePricingDraftDto.prototype, "changeNote", void 0);
class TestPricingDraftDto {
}
exports.TestPricingDraftDto = TestPricingDraftDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.1),
    (0, class_validator_1.Max)(10000),
    __metadata("design:type", Number)
], TestPricingDraftDto.prototype, "width", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.1),
    (0, class_validator_1.Max)(10000),
    __metadata("design:type", Number)
], TestPricingDraftDto.prototype, "height", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['ft', 'in']),
    __metadata("design:type", String)
], TestPricingDraftDto.prototype, "unit", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100000),
    __metadata("design:type", Number)
], TestPricingDraftDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['online', 'walk_in', 'marketer', 'employee']),
    __metadata("design:type", String)
], TestPricingDraftDto.prototype, "priceBook", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], TestPricingDraftDto.prototype, "needsDesign", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(10000),
    (0, class_validator_1.Max)(100000000),
    __metadata("design:type", Number)
], TestPricingDraftDto.prototype, "confirmedDesignFeePesewas", void 0);
//# sourceMappingURL=dto.js.map