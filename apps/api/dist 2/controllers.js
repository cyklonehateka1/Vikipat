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
exports.CatalogController = exports.QuoteController = exports.AdminController = exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const throttler_1 = require("@nestjs/throttler");
const multer_1 = require("multer");
const crypto_1 = require("crypto");
const admin_service_1 = require("./admin.service");
const auth_service_1 = require("./auth.service");
const dto_1 = require("./dto");
const security_1 = require("./security");
const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: process.env.COOKIE_SECURE === 'true', maxAge: 8 * 60 * 60 * 1000, path: '/' };
const mediaExtensions = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' };
const mediaFilename = (_req, file, callback) => callback(null, (0, crypto_1.randomUUID)() + mediaExtensions[file.mimetype]);
let AuthController = class AuthController {
    constructor(auth) {
        this.auth = auth;
    }
    async login(dto, response) { const result = await this.auth.login(dto.email, dto.password); response.cookie('admin_session', result.token, cookieOptions); return { csrfToken: result.csrf, user: result.user }; }
    me(request) { const user = request.user; return { csrfToken: user.csrf, user: { email: user.email, role: user.role, mustChangePassword: user.mustChangePassword, name: user.name, permissions: user.permissions } }; }
    logout(response) { response.clearCookie('admin_session', { ...cookieOptions, maxAge: 0 }); return { success: true }; }
    async changePassword(request, dto, response) { const result = await this.auth.changePassword(request.user.id, request.user.email, dto.currentPassword, dto.newPassword); response.clearCookie('admin_session', { ...cookieOptions, maxAge: 0 }); return result; }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(security_1.AuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.UseGuards)(security_1.AuthGuard, security_1.CsrfGuard),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('change-password'),
    (0, common_1.UseGuards)(security_1.AuthGuard, security_1.CsrfGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.ChangePasswordDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
let AdminController = class AdminController {
    constructor(admin) {
        this.admin = admin;
    }
    products(q) { return this.admin.list(q); }
    product(id) { return this.admin.one(id); }
    create(req, dto) { return this.admin.create(dto, req.user.email); }
    update(req, id, dto) { return this.admin.update(id, dto, req.user.email); }
    remove(req, id) { return this.admin.remove(id, req.user.email); }
    adjust(req, id, dto) { return this.admin.adjust(id, dto, req.user.email); }
    stock() { return this.admin.stockActivity(); }
    dashboard() { return this.admin.summary(); }
    insights() { return this.admin.insights(); }
    activity() { return this.admin.activity(); }
    settings() { return this.admin.getSettings(); }
    updateSettings(req, dto) { return this.admin.updateSettings(dto, req.user.email); }
    quotes() { return this.admin.listQuotes(); }
    updateQuote(req, id, dto) { return this.admin.updateQuoteStatus(id, dto.status, req.user.email); }
    upload(file) { if (!file)
        throw new common_1.BadRequestException('A valid JPG, PNG or WebP image is required'); return { url: `${process.env.API_PUBLIC_URL || 'http://localhost:3000'}/uploads/${file.filename}` }; }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('products'),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "products", null);
__decorate([
    (0, common_1.Get)('products/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "product", null);
__decorate([
    (0, common_1.Post)('products'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateProductDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)('products/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateProductDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('products/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('products/:id/stock'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.AdjustStockDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "adjust", null);
__decorate([
    (0, common_1.Get)('stock-activity'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "stock", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "dashboard", null);
__decorate([
    (0, common_1.Get)('insights'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "insights", null);
__decorate([
    (0, common_1.Get)('activity'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "activity", null);
__decorate([
    (0, common_1.Get)('settings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "settings", null);
__decorate([
    (0, common_1.Patch)('settings'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.UpdateSettingsDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Get)('quotes'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "quotes", null);
__decorate([
    (0, common_1.Patch)('quotes/:id/status'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateQuoteStatusDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateQuote", null);
__decorate([
    (0, common_1.Post)('media'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.diskStorage)({ destination: process.env.UPLOAD_DIRECTORY || 'uploads', filename: mediaFilename }), limits: { fileSize: 5 * 1024 * 1024, files: 1 }, fileFilter: (_req, file, callback) => callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "upload", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(security_1.AuthGuard, security_1.PasswordChangedGuard, security_1.CsrfGuard, security_1.AdminOnlyGuard),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
let QuoteController = class QuoteController {
    constructor(admin) {
        this.admin = admin;
    }
    create(dto) { return this.admin.createQuote(dto); }
    upload(file) { if (!file)
        throw new common_1.BadRequestException('A valid artwork file is required'); return { url: `${process.env.API_PUBLIC_URL || 'http://localhost:3000'}/uploads/${file.filename}`, name: file.originalname }; }
};
exports.QuoteController = QuoteController;
__decorate([
    (0, common_1.Post)(),
    (0, throttler_1.Throttle)({ default: { limit: 8, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateQuoteDto]),
    __metadata("design:returntype", void 0)
], QuoteController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('media'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.diskStorage)({ destination: process.env.UPLOAD_DIRECTORY || 'uploads', filename: mediaFilename }), limits: { fileSize: 10 * 1024 * 1024, files: 1 }, fileFilter: (_req, file, callback) => { const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']; if (!allowed.includes(file.mimetype))
            return callback(new common_1.BadRequestException('Artwork must be PDF, JPG, PNG or WebP'), false); callback(null, true); } })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QuoteController.prototype, "upload", null);
exports.QuoteController = QuoteController = __decorate([
    (0, common_1.Controller)('quotes'),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], QuoteController);
let CatalogController = class CatalogController {
    constructor(admin) {
        this.admin = admin;
    }
    catalog() { return this.admin.publicCatalog(); }
    product(id) { return this.admin.publicProduct(id); }
};
exports.CatalogController = CatalogController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "catalog", null);
__decorate([
    (0, common_1.Get)('products/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "product", null);
exports.CatalogController = CatalogController = __decorate([
    (0, common_1.Controller)('catalog'),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], CatalogController);
//# sourceMappingURL=controllers.js.map