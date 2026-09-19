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
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const crypto_1 = require("crypto");
const typeorm_2 = require("typeorm");
const entities_1 = require("./entities");
let PaymentService = class PaymentService {
    constructor(payments, dataSource) {
        this.payments = payments;
        this.dataSource = dataSource;
    }
    async initializePaystack(order) {
        if (order.requiresReview || order.totalPesewas <= 0)
            return null;
        const existing = order.paymentReference ? await this.payments.findOneBy({ reference: order.paymentReference }) : null;
        if (existing) {
            return {
                reference: existing.reference,
                authorizationUrl: existing.authorizationUrl,
                accessCode: existing.accessCode,
                providerConfigured: Boolean(existing.authorizationUrl),
            };
        }
        const reference = `VP-${order.orderNumber.replace('VP-', '')}-${(0, crypto_1.randomUUID)().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
        const secret = process.env.PAYSTACK_SECRET_KEY || '';
        let authorizationUrl = '';
        let accessCode = '';
        let providerResponse = '{}';
        if (secret) {
            const response = await fetch('https://api.paystack.co/transaction/initialize', {
                method: 'POST',
                headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: order.customerEmail,
                    amount: order.totalPesewas,
                    currency: 'GHS',
                    reference,
                    callback_url: this.callbackUrl(order, reference),
                    channels: ['mobile_money', 'card'],
                    metadata: { orderNumber: order.orderNumber, orderId: order.id, customerName: order.customerName },
                }),
            });
            const data = await response.json().catch(() => ({}));
            providerResponse = JSON.stringify(data);
            if (response.ok && data?.status && data?.data?.authorization_url) {
                authorizationUrl = String(data.data.authorization_url);
                accessCode = String(data.data.access_code || '');
            }
        }
        await this.payments.save(this.payments.create({
            orderId: order.id,
            orderNumber: order.orderNumber,
            provider: 'paystack',
            reference,
            amountPesewas: order.totalPesewas,
            currency: 'GHS',
            status: authorizationUrl ? 'initialized' : 'pending',
            authorizationUrl,
            accessCode,
            providerResponse,
        }));
        return { reference, authorizationUrl, accessCode, providerConfigured: Boolean(authorizationUrl) };
    }
    async listAdminPayments() {
        return this.payments.find({ order: { createdAt: 'DESC' }, take: 500 });
    }
    async adminPaymentSummary() {
        const payments = await this.payments.find();
        const total = payments.reduce((sum, payment) => sum + payment.amountPesewas, 0);
        const paid = payments.filter((payment) => payment.status === 'paid');
        const pending = payments.filter((payment) => ['initialized', 'pending'].includes(payment.status));
        const failed = payments.filter((payment) => ['failed', 'abandoned'].includes(payment.status));
        return {
            totalCount: payments.length,
            totalPesewas: total,
            paidCount: paid.length,
            paidPesewas: paid.reduce((sum, payment) => sum + payment.amountPesewas, 0),
            pendingCount: pending.length,
            pendingPesewas: pending.reduce((sum, payment) => sum + payment.amountPesewas, 0),
            failedCount: failed.length,
            failedPesewas: failed.reduce((sum, payment) => sum + payment.amountPesewas, 0),
            generatedAt: new Date().toISOString(),
        };
    }
    verifyPaystackSignature(rawBody, signature) {
        const secret = process.env.PAYSTACK_SECRET_KEY || '';
        if (!secret)
            throw new common_1.BadRequestException('Paystack is not configured');
        if (!rawBody || !signature)
            throw new common_1.UnauthorizedException('Invalid Paystack signature');
        const digest = (0, crypto_1.createHmac)('sha512', secret).update(rawBody).digest('hex');
        const expected = Buffer.from(digest);
        const provided = Buffer.from(signature);
        if (expected.length !== provided.length || !(0, crypto_1.timingSafeEqual)(expected, provided)) {
            throw new common_1.UnauthorizedException('Invalid Paystack signature');
        }
    }
    async handlePaystackEvent(payload) {
        const event = String(payload?.event || '');
        const data = payload?.data || {};
        const reference = String(data?.reference || '');
        if (!reference)
            throw new common_1.BadRequestException('Missing payment reference');
        if (event !== 'charge.success')
            return { received: true, ignored: true, reference, event };
        return this.markPaystackPaid(reference, data);
    }
    async verifyPaystackReference(reference) {
        const secret = process.env.PAYSTACK_SECRET_KEY || '';
        if (!secret)
            throw new common_1.BadRequestException('Paystack is not configured');
        const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
            headers: { Authorization: `Bearer ${secret}` },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.status)
            throw new common_1.BadRequestException('Could not verify payment');
        if (payload?.data?.status !== 'success')
            return { received: true, paid: false, reference, status: payload?.data?.status || 'unknown' };
        return this.markPaystackPaid(reference, payload.data);
    }
    async markPaystackPaid(reference, data) {
        return this.dataSource.transaction(async (manager) => {
            const paymentRepo = manager.getRepository(entities_1.PaymentTransaction);
            const orderRepo = manager.getRepository(entities_1.Order);
            const historyRepo = manager.getRepository(entities_1.OrderStatusHistory);
            const outboxRepo = manager.getRepository(entities_1.NotificationOutbox);
            const itemRepo = manager.getRepository(entities_1.OrderItem);
            const jobRepo = manager.getRepository(entities_1.ProductionJob);
            const payment = await paymentRepo.findOneBy({ reference });
            if (!payment)
                throw new common_1.BadRequestException('Payment reference not found');
            const order = await orderRepo.findOneBy({ id: payment.orderId });
            if (!order)
                throw new common_1.BadRequestException('Payment order not found');
            const amount = Number(data?.amount || 0);
            const currency = String(data?.currency || payment.currency);
            if (amount !== payment.amountPesewas || currency !== payment.currency) {
                payment.status = 'failed';
                payment.providerResponse = JSON.stringify(data);
                await paymentRepo.save(payment);
                throw new common_1.BadRequestException('Payment amount or currency mismatch');
            }
            if (payment.status === 'paid' && order.paymentStatus === 'paid') {
                return { received: true, paid: true, idempotent: true, orderNumber: order.orderNumber, reference };
            }
            payment.status = 'paid';
            payment.providerResponse = JSON.stringify(data);
            await paymentRepo.save(payment);
            order.paymentStatus = 'paid';
            order.status = order.status === 'awaiting_payment' ? 'paid' : order.status;
            order.paymentProvider = 'paystack';
            order.paymentReference = reference;
            await orderRepo.save(order);
            await historyRepo.save(historyRepo.create({
                orderId: order.id,
                status: order.status,
                actor: 'paystack',
                customerVisible: true,
                note: 'Payment received. Your order is ready for production review.',
            }));
            if (!await jobRepo.existsBy({ orderId: order.id })) {
                const items = await itemRepo.findBy({ orderId: order.id });
                const jobs = [];
                for (let index = 0; index < items.length; index++) {
                    const item = items[index];
                    const spec = JSON.parse(item.specification || '{}');
                    jobs.push(jobRepo.create({
                        orderId: order.id,
                        orderItemId: item.id,
                        orderNumber: order.orderNumber,
                        jobNumber: `${order.orderNumber}-J${String(index + 1).padStart(2, '0')}`,
                        customerName: order.customerName,
                        serviceCode: item.serviceCode,
                        title: item.name,
                        quantity: item.quantity,
                        stage: spec.needsDesign ? 'artwork_review' : 'intake',
                        dueDate: order.promisedDate || '',
                        specification: item.specification,
                    }));
                }
                await jobRepo.save(jobs);
                if (jobs.length) {
                    order.status = jobs.some((job) => job.stage === 'artwork_review') ? 'artwork_review' : 'ready_for_production';
                    await orderRepo.save(order);
                    await historyRepo.save(historyRepo.create({
                        orderId: order.id,
                        status: order.status,
                        actor: 'paystack',
                        customerVisible: true,
                        note: order.status === 'artwork_review' ? 'Artwork/design review is required before production.' : 'Order released into production intake.',
                    }));
                }
            }
            await outboxRepo.save(outboxRepo.create({
                orderId: order.id,
                channel: 'email',
                recipient: order.customerEmail,
                template: 'payment_received',
                payload: JSON.stringify({ subject: `Vikipat order ${order.orderNumber}: payment received`, text: `Hello ${order.customerName}, payment has been received for order ${order.orderNumber}.` }),
            }));
            return { received: true, paid: true, orderNumber: order.orderNumber, reference };
        });
    }
    callbackUrl(order, reference) {
        const base = process.env.PAYSTACK_CALLBACK_URL || `${process.env.API_PUBLIC_URL || ''}/confirmation`;
        if (!base || base === '/confirmation')
            return undefined;
        const url = new URL(base);
        url.searchParams.set('orderNumber', order.orderNumber);
        url.searchParams.set('email', order.customerEmail);
        url.searchParams.set('payment', reference);
        return url.toString();
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.PaymentTransaction)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource])
], PaymentService);
//# sourceMappingURL=payment.service.js.map