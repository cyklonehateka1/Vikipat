import { CommerceIntegrity1720000010000 } from './migrations/1720000010000-CommerceIntegrity';
import { CustomerPhoneIdentity1720000011000 } from './migrations/1720000011000-CustomerPhoneIdentity';
import { CommerceController, CommerceService } from './commerce.service';
import { UniqueProductionOrderItem1720000005000 } from './migrations/1720000005000-UniqueProductionOrderItem';
import { MultiItemOrders1720000006000 } from './migrations/1720000006000-MultiItemOrders';
import { OrderLookupIndices1720000007000 } from './migrations/1720000007000-OrderLookupIndices';
import { PricingRuleCopyFields1720000008000 } from './migrations/1720000008000-PricingRuleCopyFields';
import { CustomersPeopleAndRefunds1720000009000 } from './migrations/1720000009000-CustomersPeopleAndRefunds';
import { StaffAccessSchema1720000004000 } from './migrations/1720000004000-StaffAccessSchema';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { Module } from '@nestjs/common';
import './env';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AuthService } from './auth.service';
import { AdminController, AuthController, CatalogController, HealthController, QuoteController } from './controllers';
import { AdminOrderController, CustomerOrderController } from './order.controller';
import { NotificationService } from './notification.service';
import { OrderService } from './order.service';
import { AdminPaymentController, PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentReconciliationService } from './payment-reconciliation.service';
import { CustomerService } from './customer.service';
import { MailService } from './mail.service';
import { StorageService } from './storage.service';
import { OrderRefund, BusinessPolicy, AttendanceRecord, AuditLog, Customer, Employee, Estimate, NotificationOutbox, Order, OrderItem, OrderStatusHistory, OrderTrackingOtp, PasswordResetToken, PaymentTransaction, PayrollRun, Payslip, PricingRuleDraft, Product, ProductionJob, ProductionJobActivity, QuoteRequest, ServicePriceRule, ServicePriceRuleVersion, StockActivity, StoreSettings, User } from './entities';
import { PricingAdminController } from './pricing-admin.controller';
import { AnalyticsController, CustomerController, PeopleController } from './people.controller';
import { PeopleService } from './people.service';
import { AnalyticsService } from './analytics.service';
import { PricingAdminService } from './pricing-admin.service';
import { InitialPlatformSchema1720000000000 } from './migrations/1720000000000-InitialPlatformSchema';
import { PaymentCheckoutSchema1720000001000 } from './migrations/1720000001000-PaymentCheckoutSchema';
import { OperationsJobsSchema1720000002000 } from './migrations/1720000002000-OperationsJobsSchema';
import { ProductionJobActivitySchema1720000003000 } from './migrations/1720000003000-ProductionJobActivitySchema';
import { AdminOnlyGuard, OperationsGuard, AuthGuard, CsrfGuard, PasswordChangedGuard } from './security';

const entities = [OrderRefund, BusinessPolicy,User, Product, StockActivity, StoreSettings, AuditLog, QuoteRequest, ServicePriceRule, ServicePriceRuleVersion, PricingRuleDraft, Estimate, Customer, Order, OrderItem, ProductionJob, ProductionJobActivity, OrderStatusHistory, OrderTrackingOtp, PaymentTransaction, NotificationOutbox, Employee, AttendanceRecord, PayrollRun, Payslip, PasswordResetToken];
const database = process.env.DATABASE_DRIVER === 'sqlite'
  ? {
      type: 'sqlite' as const,
      database: process.env.DATABASE_PATH || 'apps/api/vikipat.sqlite',
      entities,
      synchronize: true,
    }
  : {
      type: 'postgres' as const,
      host: process.env.POSTGRES_HOST || 'localhost',
      port: Number(process.env.POSTGRES_PORT || 5432),
      username: process.env.POSTGRES_USER || 'vikipat',
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB || 'vikipat',
      ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: true } : false,
      entities,
      synchronize: false,
      migrations: [InitialPlatformSchema1720000000000, PaymentCheckoutSchema1720000001000, OperationsJobsSchema1720000002000, ProductionJobActivitySchema1720000003000, StaffAccessSchema1720000004000, UniqueProductionOrderItem1720000005000, MultiItemOrders1720000006000, OrderLookupIndices1720000007000, PricingRuleCopyFields1720000008000, CustomersPeopleAndRefunds1720000009000, CommerceIntegrity1720000010000, CustomerPhoneIdentity1720000011000],
      migrationsRun: true,
    };

@Module({
  imports: [
    TypeOrmModule.forRoot(database),
    TypeOrmModule.forFeature(entities),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'dev-only-change-this-64-character-secret-before-production-2026',
      signOptions: { issuer: 'vikipat-api', audience: 'vikipat-admin' },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
  ],
  controllers: [CommerceController,StaffController, AuthController, AdminController, CatalogController, HealthController, QuoteController, CustomerOrderController, AdminOrderController, PricingAdminController, PaymentController, AdminPaymentController, PeopleController, AnalyticsController, CustomerController],
  providers: [CommerceService,
    StaffService,
    AdminOnlyGuard,
    OperationsGuard,
    AuthService,
    AdminService,
    OrderService,
    NotificationService,
    PaymentService,
    PricingAdminService,
    PaymentReconciliationService,
    PeopleService,
    AnalyticsService,
    CustomerService,
    MailService,
    StorageService,
    AuthGuard,
    PasswordChangedGuard,
    CsrfGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
