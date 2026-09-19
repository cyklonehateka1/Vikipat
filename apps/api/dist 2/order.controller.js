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
exports.AdminOrderController = exports.CustomerOrderController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const dto_1 = require("./dto");
const order_service_1 = require("./order.service");
const security_1 = require("./security");
const trackingCookie = { httpOnly: true, sameSite: 'strict', secure: process.env.COOKIE_SECURE === 'true', maxAge: 20 * 60 * 1000, path: '/api/order-tracking' };
let CustomerOrderController = class CustomerOrderController {
    constructor(orders) {
        this.orders = orders;
    }
    services() { return this.orders.listRules(); }
    estimate(dto) { return this.orders.createPublicEstimate(dto); }
    create(dto) { return this.orders.createGuest(dto, 'online'); }
    requestOtp(dto) { return this.orders.requestOtp(dto.orderNumber, dto.email); }
    async verifyOtp(dto, response) { const result = await this.orders.verifyOtp(dto.orderNumber, dto.email, dto.code); response.cookie('order_tracking', result.token, trackingCookie); return { order: result.order }; }
    tracked(request) { return this.orders.tracked(request.cookies?.order_tracking); }
    logout(response) { response.clearCookie('order_tracking', { ...trackingCookie, maxAge: 0 }); return { success: true }; }
};
exports.CustomerOrderController = CustomerOrderController;
__decorate([
    (0, common_1.Get)('services/large-format'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CustomerOrderController.prototype, "services", null);
__decorate([
    (0, common_1.Post)('estimates/large-format'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.LargeFormatEstimateDto]),
    __metadata("design:returntype", void 0)
], CustomerOrderController.prototype, "estimate", null);
__decorate([
    (0, common_1.Post)('orders'),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateGuestOrderDto]),
    __metadata("design:returntype", void 0)
], CustomerOrderController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('order-tracking/request-otp'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 15 * 60000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.RequestTrackingOtpDto]),
    __metadata("design:returntype", void 0)
], CustomerOrderController.prototype, "requestOtp", null);
__decorate([
    (0, common_1.Post)('order-tracking/verify-otp'),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 15 * 60000 } }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.VerifyTrackingOtpDto, Object]),
    __metadata("design:returntype", Promise)
], CustomerOrderController.prototype, "verifyOtp", null);
__decorate([
    (0, common_1.Get)('order-tracking/order'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustomerOrderController.prototype, "tracked", null);
__decorate([
    (0, common_1.Post)('order-tracking/logout'),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustomerOrderController.prototype, "logout", null);
exports.CustomerOrderController = CustomerOrderController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [order_service_1.OrderService])
], CustomerOrderController);
let AdminOrderController = class AdminOrderController {
    constructor(orders) {
        this.orders = orders;
    }
    list() { return this.orders.list(); }
    intake(request) { if (!request.user.permissions.includes('jobs.release'))
        throw new common_1.ForbiddenException('Job release permission required'); return this.orders.listProductionIntake(); }
    jobs(request) { return this.orders.listProductionJobs(request.user.role); }
    create(dto) { return this.orders.createGuest(dto, dto.source === 'salesperson' ? 'salesperson' : 'walk_in'); }
    release(request, id) { if (!request.user.permissions.includes('jobs.release'))
        throw new common_1.ForbiddenException('Job release permission required'); return this.orders.releaseOrderToProduction(id, request.user.email); }
    update(request, id, dto) { return this.orders.updateStatus(id, dto.status, dto.note || '', dto.customerVisible !== false, request.user.email); }
    jobActivity(id) { return this.orders.listProductionJobActivity(id); }
    addJobNote(request, id, dto) { if (!request.user.permissions.includes('jobs.note'))
        throw new common_1.ForbiddenException('Job note permission required'); return this.orders.addProductionJobNote(id, dto.note, request.user.email); }
    updateJob(request, id, dto) { return this.orders.updateProductionJob(id, dto, request.user.email, request.user.role); }
};
exports.AdminOrderController = AdminOrderController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(security_1.AdminOnlyGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminOrderController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('production/intake'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminOrderController.prototype, "intake", null);
__decorate([
    (0, common_1.Get)('production/jobs'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminOrderController.prototype, "jobs", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(security_1.AdminOnlyGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateGuestOrderDto]),
    __metadata("design:returntype", void 0)
], AdminOrderController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/release'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminOrderController.prototype, "release", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, common_1.UseGuards)(security_1.AdminOnlyGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateOrderStatusDto]),
    __metadata("design:returntype", void 0)
], AdminOrderController.prototype, "update", null);
__decorate([
    (0, common_1.Get)('production/jobs/:id/activity'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminOrderController.prototype, "jobActivity", null);
__decorate([
    (0, common_1.Post)('production/jobs/:id/activity'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.AddProductionJobNoteDto]),
    __metadata("design:returntype", void 0)
], AdminOrderController.prototype, "addJobNote", null);
__decorate([
    (0, common_1.Patch)('production/jobs/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateProductionJobDto]),
    __metadata("design:returntype", void 0)
], AdminOrderController.prototype, "updateJob", null);
exports.AdminOrderController = AdminOrderController = __decorate([
    (0, common_1.Controller)('admin/orders'),
    (0, common_1.UseGuards)(security_1.AuthGuard, security_1.PasswordChangedGuard, security_1.CsrfGuard, security_1.OperationsGuard),
    __metadata("design:paramtypes", [order_service_1.OrderService])
], AdminOrderController);
//# sourceMappingURL=order.controller.js.map