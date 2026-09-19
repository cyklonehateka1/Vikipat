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
exports.AdminPaymentController = exports.PaymentController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const payment_service_1 = require("./payment.service");
const security_1 = require("./security");
let PaymentController = class PaymentController {
    constructor(payments) {
        this.payments = payments;
    }
    paystackWebhook(request, signature, payload) {
        this.payments.verifyPaystackSignature(request.rawBody, signature);
        return this.payments.handlePaystackEvent(payload);
    }
    verify(reference) {
        return this.payments.verifyPaystackReference(reference);
    }
};
exports.PaymentController = PaymentController;
__decorate([
    (0, common_1.Post)('paystack/webhook'),
    (0, throttler_1.Throttle)({ default: { limit: 120, ttl: 60_000 } }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('x-paystack-signature')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], PaymentController.prototype, "paystackWebhook", null);
__decorate([
    (0, common_1.Get)('paystack/verify/:reference'),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    __param(0, (0, common_1.Param)('reference')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PaymentController.prototype, "verify", null);
exports.PaymentController = PaymentController = __decorate([
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payment_service_1.PaymentService])
], PaymentController);
let AdminPaymentController = class AdminPaymentController {
    constructor(payments) {
        this.payments = payments;
    }
    list() {
        return this.payments.listAdminPayments();
    }
    summary() {
        return this.payments.adminPaymentSummary();
    }
};
exports.AdminPaymentController = AdminPaymentController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminPaymentController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('summary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminPaymentController.prototype, "summary", null);
exports.AdminPaymentController = AdminPaymentController = __decorate([
    (0, common_1.Controller)('admin/payments'),
    (0, common_1.UseGuards)(security_1.AuthGuard, security_1.PasswordChangedGuard, security_1.CsrfGuard, security_1.AdminOnlyGuard),
    __metadata("design:paramtypes", [payment_service_1.PaymentService])
], AdminPaymentController);
//# sourceMappingURL=payment.controller.js.map