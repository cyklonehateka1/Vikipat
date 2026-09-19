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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingAdminController = void 0;
const common_1 = require("@nestjs/common");
const dto_1 = require("./dto");
const pricing_admin_service_1 = require("./pricing-admin.service");
const security_1 = require("./security");
let PricingAdminController = class PricingAdminController {
    constructor(pricing) {
        this.pricing = pricing;
    }
    list() { return this.pricing.list(); }
    history(id) { return this.pricing.history(id); }
    saveDraft(req, id, dto) { return this.pricing.saveDraft(id, dto, req.user.email); }
    test(id, dto) { return this.pricing.testDraft(id, dto); }
    publish(req, id) { return this.pricing.publish(id, req.user.email); }
};
exports.PricingAdminController = PricingAdminController;
__decorate([
    (0, common_1.Get)('rules'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PricingAdminController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('rules/:id/history'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PricingAdminController.prototype, "history", null);
__decorate([
    (0, common_1.Patch)('rules/:id/draft'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.SavePricingDraftDto]),
    __metadata("design:returntype", void 0)
], PricingAdminController.prototype, "saveDraft", null);
__decorate([
    (0, common_1.Post)('drafts/:id/test'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.TestPricingDraftDto]),
    __metadata("design:returntype", void 0)
], PricingAdminController.prototype, "test", null);
__decorate([
    (0, common_1.Post)('drafts/:id/publish'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PricingAdminController.prototype, "publish", null);
exports.PricingAdminController = PricingAdminController = __decorate([
    (0, common_1.Controller)('admin/pricing'),
    (0, common_1.UseGuards)(security_1.AuthGuard, security_1.PasswordChangedGuard, security_1.CsrfGuard, security_1.AdminOnlyGuard),
    __metadata("design:paramtypes", [pricing_admin_service_1.PricingAdminService])
], PricingAdminController);
//# sourceMappingURL=pricing-admin.controller.js.map