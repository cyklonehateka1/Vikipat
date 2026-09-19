"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const _1720000004000_StaffAccessSchema_1 = require("./migrations/1720000004000-StaffAccessSchema");
const staff_controller_1 = require("./staff.controller");
const staff_service_1 = require("./staff.service");
const common_1 = require("@nestjs/common");
require("./env");
const core_1 = require("@nestjs/core");
const jwt_1 = require("@nestjs/jwt");
const throttler_1 = require("@nestjs/throttler");
const typeorm_1 = require("@nestjs/typeorm");
const admin_service_1 = require("./admin.service");
const auth_service_1 = require("./auth.service");
const controllers_1 = require("./controllers");
const order_controller_1 = require("./order.controller");
const notification_service_1 = require("./notification.service");
const order_service_1 = require("./order.service");
const payment_controller_1 = require("./payment.controller");
const payment_service_1 = require("./payment.service");
const entities_1 = require("./entities");
const pricing_admin_controller_1 = require("./pricing-admin.controller");
const pricing_admin_service_1 = require("./pricing-admin.service");
const _1720000000000_InitialPlatformSchema_1 = require("./migrations/1720000000000-InitialPlatformSchema");
const _1720000001000_PaymentCheckoutSchema_1 = require("./migrations/1720000001000-PaymentCheckoutSchema");
const _1720000002000_OperationsJobsSchema_1 = require("./migrations/1720000002000-OperationsJobsSchema");
const _1720000003000_ProductionJobActivitySchema_1 = require("./migrations/1720000003000-ProductionJobActivitySchema");
const security_1 = require("./security");
const entities = [entities_1.User, entities_1.Product, entities_1.StockActivity, entities_1.StoreSettings, entities_1.AuditLog, entities_1.QuoteRequest, entities_1.ServicePriceRule, entities_1.ServicePriceRuleVersion, entities_1.PricingRuleDraft, entities_1.Estimate, entities_1.Order, entities_1.OrderItem, entities_1.ProductionJob, entities_1.ProductionJobActivity, entities_1.OrderStatusHistory, entities_1.OrderTrackingOtp, entities_1.PaymentTransaction, entities_1.NotificationOutbox];
const database = process.env.DATABASE_DRIVER === 'sqlite'
    ? {
        type: 'sqlite',
        database: process.env.DATABASE_PATH || 'apps/api/vikipat.sqlite',
        entities,
        synchronize: true,
    }
    : {
        type: 'postgres',
        host: process.env.POSTGRES_HOST || 'localhost',
        port: Number(process.env.POSTGRES_PORT || 5432),
        username: process.env.POSTGRES_USER || 'vikipat',
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB || 'vikipat',
        ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: true } : false,
        entities,
        synchronize: false,
        migrations: [_1720000000000_InitialPlatformSchema_1.InitialPlatformSchema1720000000000, _1720000001000_PaymentCheckoutSchema_1.PaymentCheckoutSchema1720000001000, _1720000002000_OperationsJobsSchema_1.OperationsJobsSchema1720000002000, _1720000003000_ProductionJobActivitySchema_1.ProductionJobActivitySchema1720000003000, _1720000004000_StaffAccessSchema_1.StaffAccessSchema1720000004000],
        migrationsRun: true,
    };
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRoot(database),
            typeorm_1.TypeOrmModule.forFeature(entities),
            jwt_1.JwtModule.register({
                global: true,
                secret: process.env.JWT_SECRET || 'dev-only-change-this-64-character-secret-before-production-2026',
                signOptions: { issuer: 'vikipat-api', audience: 'vikipat-admin' },
            }),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
        ],
        controllers: [staff_controller_1.StaffController, controllers_1.AuthController, controllers_1.AdminController, controllers_1.CatalogController, controllers_1.QuoteController, order_controller_1.CustomerOrderController, order_controller_1.AdminOrderController, pricing_admin_controller_1.PricingAdminController, payment_controller_1.PaymentController, payment_controller_1.AdminPaymentController],
        providers: [
            staff_service_1.StaffService,
            security_1.AdminOnlyGuard,
            security_1.OperationsGuard,
            auth_service_1.AuthService,
            admin_service_1.AdminService,
            order_service_1.OrderService,
            notification_service_1.NotificationService,
            payment_service_1.PaymentService,
            pricing_admin_service_1.PricingAdminService,
            security_1.AuthGuard,
            security_1.PasswordChangedGuard,
            security_1.CsrfGuard,
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map