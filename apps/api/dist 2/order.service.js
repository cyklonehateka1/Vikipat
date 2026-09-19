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
exports.OrderService = void 0;
const production_workflow_1 = require("./production-workflow");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const crypto_1 = require("crypto");
const typeorm_2 = require("typeorm");
const entities_1 = require("./entities");
const notification_service_1 = require("./notification.service");
const payment_service_1 = require("./payment.service");
const domain_1 = require("@vikipat/domain");
const pricing_engine_1 = require("@vikipat/pricing-engine");
const RATE_SEED = [
    ['sav-sticker', 'SAV / Sticker', 210, 220, 240], ['flexy-banner', 'Flexy / Banner', 230, 240, 260], ['oneway-vision', 'Oneway Vision', 590, 605, 630],
    ['transparent-sav', 'Transparent SAV', 380, 390, 410], ['reflective-sav', 'Reflective SAV', 600, 615, 650], ['blueback', 'Blueback', 380, 390, 410],
    ['ash-back-pvc', 'Ash Back / PVC', 700, 715, 730], ['white-back', 'White Back', 220, 235, 260], ['flag', 'Flag', 540, 550, 580],
    ['cutting-sav', 'Cutting (SAV)', 410, 420, 440], ['cutting-tsav', 'Cutting (TSAV)', 580, 590, 610], ['cutting-only', 'Cutting Only', 150, 160, 180], ['photopaper', 'Photopaper', 590, 605, 610],
];
const PUBLIC_STATUS = { pending_review: 'Under review', awaiting_payment: 'Awaiting payment', paid: 'Payment received', artwork_review: 'Artwork review', awaiting_proof: 'Awaiting your approval', ready_for_production: 'Ready for production', in_production: 'In production', quality_check: 'Quality check', ready: 'Ready for pickup', out_for_delivery: 'Out for delivery', completed: 'Completed', on_hold: 'On hold', cancelled: 'Cancelled' };
let OrderService = class OrderService {
    constructor(rules, estimates, orders, items, jobs, jobActivity, history, otps, outbox, jwt, notifications, payments) {
        this.rules = rules;
        this.estimates = estimates;
        this.orders = orders;
        this.items = items;
        this.jobs = jobs;
        this.jobActivity = jobActivity;
        this.history = history;
        this.otps = otps;
        this.outbox = outbox;
        this.jwt = jwt;
        this.notifications = notifications;
        this.payments = payments;
    }
    onApplicationBootstrap() { return this.seed(); }
    async seed() { for (const [code, name, employee, marketer, walkIn] of RATE_SEED) {
        if (!await this.rules.findOneBy({ code }))
            await this.rules.save(this.rules.create({ code, name, material: name, employeeRatePesewas: employee, marketerRatePesewas: marketer, walkInRatePesewas: walkIn, onlineRatePesewas: walkIn }));
    } }
    listRules() { return this.rules.find({ where: { active: true }, order: { name: 'ASC' } }); }
    async estimate(dto, context = { priceBook: 'online', allowConfirmedDesignFee: false }) {
        const rule = await this.rules.findOneBy({ code: dto.serviceCode, active: true });
        if (!rule)
            throw new common_1.NotFoundException('Service is unavailable');
        const quote = (0, pricing_engine_1.calculateLargeFormat)({
            serviceCode: rule.code,
            serviceName: rule.name,
            version: rule.version,
            ratesPesewasPerSqFt: { online: rule.onlineRatePesewas, walk_in: rule.walkInRatePesewas, marketer: rule.marketerRatePesewas, employee: rule.employeeRatePesewas },
            designMinimumPesewas: rule.designMinimumPesewas,
            roundingMode: rule.roundingMode,
            roundingStage: 'line',
        }, {
            width: dto.width, height: dto.height, unit: dto.unit, quantity: dto.quantity, priceBook: context.priceBook, needsDesign: Boolean(dto.needsDesign),
            confirmedDesignFeePesewas: context.allowConfirmedDesignFee ? dto.designFeePesewas : undefined,
        });
        return { ...quote, name: quote.serviceName, areaSqFt: quote.areaPerPieceSqFt, ratePesewas: quote.ratePesewasPerSqFt, roundingPolicy: quote.roundingMode, designMessage: quote.requiresReview ? 'Design starts from GH₵100. Final fee is confirmed after review.' : null };
    }
    async createPublicEstimate(dto) {
        const quote = await this.estimate(dto, { priceBook: 'online', allowConfirmedDesignFee: false });
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        const record = await this.estimates.save(this.estimates.create({
            publicId: `EST-${(0, crypto_1.randomUUID)().replaceAll('-', '').slice(0, 12).toUpperCase()}`, calculator: quote.calculator, disposition: quote.disposition,
            serviceCode: quote.serviceCode, ruleVersion: quote.ruleVersion, priceBook: quote.priceBook, subtotalPesewas: quote.basePesewas,
            designFeePesewas: quote.designFeePesewas, totalPesewas: quote.totalPesewas, currency: 'GHS', fingerprint: quote.fingerprint,
            inputSnapshot: JSON.stringify({ serviceCode: dto.serviceCode, width: dto.width, height: dto.height, unit: dto.unit, quantity: dto.quantity, needsDesign: Boolean(dto.needsDesign) }),
            calculationSnapshot: JSON.stringify(quote), expiresAt,
        }));
        return { ...quote, estimateId: record.publicId, expiresAt };
    }
    async createGuest(dto, source = 'online') {
        if (dto.website)
            return { success: true };
        const quote = await this.estimate(dto.item, { priceBook: (0, domain_1.priceBookForSource)(source), allowConfirmedDesignFee: source !== 'online' });
        await this.assertEstimateMatches(dto.item, quote);
        const orderNumber = await this.uniqueNumber();
        const order = await this.orders.save(this.orders.create({ orderNumber, source, customerName: dto.customerName.trim(), customerEmail: dto.customerEmail.trim().toLowerCase(), customerPhone: dto.customerPhone || '', status: quote.requiresReview ? 'pending_review' : 'awaiting_payment', paymentStatus: quote.requiresReview ? 'unpaid' : 'pending', subtotalPesewas: quote.basePesewas, designFeePesewas: quote.designFeePesewas, totalPesewas: quote.totalPesewas, requiresReview: quote.requiresReview, promisedDate: dto.requestedDate || '', customerNote: this.checkoutNote(dto) }));
        await this.items.save(this.items.create({ orderId: order.id, serviceCode: quote.serviceCode, name: quote.name, quantity: quote.quantity, unitPricePesewas: Math.round(quote.basePesewas / quote.quantity), totalPesewas: quote.totalPesewas, specification: JSON.stringify({ estimateId: dto.item.estimateId || '', width: quote.width, height: quote.height, unit: quote.unit, areaSqFt: quote.areaSqFt, totalAreaSqFt: quote.totalAreaSqFt, ratePesewas: quote.ratePesewas, priceBook: quote.priceBook, ruleVersion: quote.ruleVersion, fingerprint: quote.fingerprint, needsDesign: Boolean(dto.item.needsDesign), roundingPolicy: quote.roundingPolicy, artworkOption: dto.artworkOption || '', artworkUrl: dto.artworkUrl || '', artworkName: dto.artworkName || '', artworkLink: dto.artworkLink || '', fulfilmentMethod: dto.fulfilmentMethod || '', deliveryAddress: dto.deliveryAddress || '', deliveryLandmark: dto.deliveryLandmark || '' }) }));
        await this.history.save(this.history.create({ orderId: order.id, status: order.status, actor: source, customerVisible: true, note: quote.requiresReview ? 'We are reviewing the design requirement and final price.' : 'Your order is ready for payment.' }));
        const payment = source === 'online' ? await this.payments.initializePaystack(order) : null;
        if (payment) {
            order.paymentProvider = 'paystack';
            order.paymentReference = payment.reference;
            await this.orders.save(order);
        }
        await this.notifications.queueEmail(order, 'order_created', { subject: `Vikipat order ${orderNumber} received`, text: `Hello ${order.customerName}, your order number is ${orderNumber}. Current status: ${PUBLIC_STATUS[order.status]}.` });
        return { orderNumber, status: PUBLIC_STATUS[order.status], paymentStatus: order.paymentStatus, totalPesewas: order.totalPesewas, requiresReview: order.requiresReview, payment: payment ? { provider: 'paystack', reference: payment.reference, authorizationUrl: payment.authorizationUrl, accessCode: payment.accessCode, providerConfigured: payment.providerConfigured } : null };
    }
    async requestOtp(orderNumber, email) {
        const normalized = email.trim().toLowerCase();
        const order = await this.orders.findOneBy({ orderNumber, customerEmail: normalized });
        let devOtp;
        if (order) {
            await this.otps.update({ orderId: order.id, consumed: false }, { consumed: true });
            const code = String((0, crypto_1.randomInt)(0, 1000000)).padStart(6, '0');
            const otp = this.otps.create({ orderId: order.id, emailHash: this.hmac(normalized), codeHash: this.hmac(`${order.id}:${code}`), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
            await this.otps.save(otp);
            await this.notifications.queueEmail(order, 'tracking_otp', { subject: `Your Vikipat tracking code`, text: `Your verification code is ${code}. It expires in 10 minutes. Never share this code.` });
            if (process.env.NODE_ENV !== 'production')
                devOtp = code;
        }
        else
            this.hmac(`${orderNumber}:${normalized}:dummy`);
        return { message: 'If the order number and email match, a verification code has been sent.', expiresInSeconds: 600, ...(devOtp ? { devOtp } : {}) };
    }
    async verifyOtp(orderNumber, email, code) {
        const order = await this.orders.findOneBy({ orderNumber, customerEmail: email.trim().toLowerCase() });
        if (!order)
            throw new common_1.UnauthorizedException('Invalid or expired verification code');
        const otp = await this.otps.findOne({ where: { orderId: order.id, consumed: false }, order: { createdAt: 'DESC' } });
        if (!otp || otp.expiresAt.getTime() < Date.now() || otp.attempts >= 5)
            throw new common_1.UnauthorizedException('Invalid or expired verification code');
        otp.attempts += 1;
        if (otp.codeHash !== this.hmac(`${order.id}:${code}`)) {
            await this.otps.save(otp);
            throw new common_1.UnauthorizedException('Invalid or expired verification code');
        }
        otp.consumed = true;
        await this.otps.save(otp);
        const token = await this.jwt.signAsync({ orderId: order.id, emailHash: this.hmac(order.customerEmail) }, { audience: 'vikipat-order-tracking', expiresIn: '20m' });
        return { token, order: await this.safeOrder(order) };
    }
    async tracked(token) { if (!token)
        throw new common_1.UnauthorizedException('Verification required'); try {
        const p = await this.jwt.verifyAsync(token, { issuer: 'vikipat-api', audience: 'vikipat-order-tracking' });
        const order = await this.orders.findOneBy({ id: p.orderId });
        if (!order || this.hmac(order.customerEmail) !== p.emailHash)
            throw new common_1.UnauthorizedException();
        return this.safeOrder(order);
    }
    catch {
        throw new common_1.UnauthorizedException('Tracking session expired');
    } }
    async list() { return this.orders.find({ order: { createdAt: 'DESC' }, take: 250 }); }
    async listProductionJobs(role) { const jobs = await this.jobs.find({ order: { createdAt: 'DESC' }, take: 500 }); return jobs.map(job => ({ ...job, allowedStages: (0, production_workflow_1.permittedProductionStages)(job.stage, role) })); }
    async listProductionIntake() {
        const orders = await this.orders.createQueryBuilder('order')
            .where("order.status NOT IN (:...statuses)", { statuses: ['completed', 'cancelled'] })
            .andWhere("(order.paymentStatus = :paid OR order.source IN (:...sources))", { paid: 'paid', sources: ['walk_in', 'salesperson'] })
            .andWhere('NOT EXISTS (SELECT 1 FROM production_jobs job WHERE job."orderId" = CAST(order.id AS text))')
            .orderBy('order.createdAt', 'DESC').take(250).getMany();
        return orders.map(({ id, orderNumber, customerName, source, paymentStatus, status, totalPesewas }) => ({ id, orderNumber, customerName, source, paymentStatus, status, totalPesewas }));
    }
    async listProductionJobActivity(jobId) {
        const job = await this.jobs.findOneBy({ id: jobId });
        if (!job)
            throw new common_1.NotFoundException('Production job not found');
        return this.jobActivity.find({ where: { jobId }, order: { createdAt: 'DESC' }, take: 100 });
    }
    async addProductionJobNote(jobId, note, actor) {
        const job = await this.jobs.findOneBy({ id: jobId });
        if (!job)
            throw new common_1.NotFoundException('Production job not found');
        return this.jobActivity.save(this.jobActivity.create({ jobId: job.id, orderId: job.orderId, jobNumber: job.jobNumber, type: 'note', note: note.trim(), actor }));
    }
    async updateStatus(id, status, note, customerVisible, actor) { const order = await this.orders.findOneBy({ id }); if (!order)
        throw new common_1.NotFoundException('Order not found'); order.status = status; await this.orders.save(order); await this.history.save(this.history.create({ orderId: id, status, note, actor, customerVisible })); if (customerVisible) {
        const payload = { subject: `Vikipat order ${order.orderNumber}: ${PUBLIC_STATUS[status]}`, text: `Hello ${order.customerName}, your order ${order.orderNumber} is now ${PUBLIC_STATUS[status]}.${note ? ` ${note}` : ''}` };
        await this.notifications.queueEmail(order, 'order_status', payload);
        await this.notifications.queueWhatsApp(order, 'order_status', payload);
    } return order; }
    async updateProductionJob(id, dto, actor, role) {
        const result = await this.jobs.manager.transaction(async (manager) => {
            const jobs = manager.getRepository(entities_1.ProductionJob);
            const job = await jobs.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
            if (!job)
                throw new common_1.NotFoundException('Production job not found');
            const previousStage = job.stage;
            if (!(0, production_workflow_1.allowedProductionStages)(previousStage).includes(dto.stage))
                throw new common_1.BadRequestException(`Cannot move production job from ${previousStage} to ${dto.stage}. Refresh the job and choose an allowed stage.`);
            if (!(0, production_workflow_1.permittedProductionStages)(previousStage, role).includes(dto.stage))
                throw new common_1.ForbiddenException('Your role cannot make this stage change');
            if (((dto.assignedTo !== undefined && dto.assignedTo !== job.assignedTo) || (dto.dueDate !== undefined && dto.dueDate !== job.dueDate)) && !(0, domain_1.hasPermission)(role, 'jobs.assign'))
                throw new common_1.ForbiddenException('Job assignment permission required');
            if (dto.internalNote !== undefined && dto.internalNote !== job.internalNote && !(0, domain_1.hasPermission)(role, 'jobs.note'))
                throw new common_1.ForbiddenException('Job note permission required');
            const stageChanged = previousStage !== dto.stage;
            job.stage = dto.stage;
            job.assignedTo = dto.assignedTo ?? job.assignedTo;
            job.dueDate = dto.dueDate ?? job.dueDate;
            job.internalNote = dto.internalNote ?? job.internalNote;
            await jobs.save(job);
            await manager.getRepository(entities_1.ProductionJobActivity).save({
                jobId: job.id, orderId: job.orderId, jobNumber: job.jobNumber,
                type: stageChanged ? 'stage_change' : 'assignment', fromStage: previousStage, toStage: job.stage,
                note: dto.internalNote || '', actor,
            });
            const status = stageChanged ? this.orderStatusForStage(job.stage) : null;
            if (!status)
                return { job, notification: null };
            const orders = manager.getRepository(entities_1.Order);
            const order = await orders.findOne({ where: { id: job.orderId }, lock: { mode: 'pessimistic_write' } });
            if (!order)
                throw new common_1.NotFoundException('Order not found');
            if (order.status === status)
                return { job, notification: null };
            order.status = status;
            await orders.save(order);
            const note = `Your order is now ${PUBLIC_STATUS[status]}.`;
            await manager.getRepository(entities_1.OrderStatusHistory).save({ orderId: order.id, status, note, actor, customerVisible: true });
            return { job, notification: { order, payload: { subject: `Vikipat order ${order.orderNumber}: ${PUBLIC_STATUS[status]}`, text: `Hello ${order.customerName}, ${note}` } } };
        });
        if (result.notification) {
            const { order, payload } = result.notification;
            await this.notifications.queueEmail(order, 'order_status', payload);
            await this.notifications.queueWhatsApp(order, 'order_status', payload);
        }
        return result.job;
    }
    async releaseOrderToProduction(orderId, actor = 'system') {
        const order = await this.orders.findOneBy({ id: orderId });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (order.paymentStatus !== 'paid' && !['walk_in', 'salesperson'].includes(order.source))
            throw new common_1.BadRequestException('Online orders must be paid before production release');
        const existing = await this.jobs.findBy({ orderId });
        if (existing.length)
            return existing;
        const items = await this.items.findBy({ orderId });
        const created = [];
        for (let index = 0; index < items.length; index++) {
            const item = items[index];
            const spec = JSON.parse(item.specification || '{}');
            const stage = spec.needsDesign ? 'artwork_review' : 'intake';
            const job = await this.jobs.save(this.jobs.create({ orderId, orderItemId: item.id, orderNumber: order.orderNumber, jobNumber: `${order.orderNumber}-J${String(index + 1).padStart(2, '0')}`, customerName: order.customerName, serviceCode: item.serviceCode, title: item.name, quantity: item.quantity, stage, dueDate: order.promisedDate || '', specification: item.specification }));
            await this.jobActivity.save(this.jobActivity.create({ jobId: job.id, orderId: job.orderId, jobNumber: job.jobNumber, type: 'system', toStage: stage, note: 'Production job released from order intake.', actor }));
            created.push(job);
        }
        const orderStatus = created.some(job => job.stage === 'artwork_review') ? 'artwork_review' : 'ready_for_production';
        await this.updateStatus(orderId, orderStatus, created.some(job => job.stage === 'artwork_review') ? 'Artwork/design review is required before production.' : 'Order released into production intake.', true, actor);
        return created;
    }
    async safeOrder(order) { const items = await this.items.findBy({ orderId: order.id }); const history = await this.history.find({ where: { orderId: order.id, customerVisible: true }, order: { createdAt: 'ASC' } }); return { orderNumber: order.orderNumber, customerName: order.customerName, status: PUBLIC_STATUS[order.status], paymentStatus: order.paymentStatus, totalPesewas: order.totalPesewas, promisedDate: order.promisedDate, createdAt: order.createdAt, updatedAt: order.updatedAt, items: items.map(i => ({ name: i.name, quantity: i.quantity, totalPesewas: i.totalPesewas, specification: JSON.parse(i.specification) })), timeline: history.map(h => ({ status: PUBLIC_STATUS[h.status], note: h.note, createdAt: h.createdAt })) }; }
    hmac(value) { return (0, crypto_1.createHmac)('sha256', process.env.TRACKING_OTP_SECRET || process.env.JWT_SECRET || 'development-only').update(value).digest('hex'); }
    async assertEstimateMatches(input, quote) {
        if (input.fingerprint && input.fingerprint !== quote.fingerprint)
            throw new common_1.BadRequestException('Estimate has changed. Please refresh the quote and try again.');
        if (!input.estimateId)
            return;
        const estimate = await this.estimates.findOneBy({ publicId: input.estimateId });
        if (!estimate || estimate.expiresAt.getTime() < Date.now())
            throw new common_1.BadRequestException('Estimate has expired. Please refresh the quote and try again.');
        if (estimate.serviceCode !== quote.serviceCode || estimate.fingerprint !== quote.fingerprint)
            throw new common_1.BadRequestException('Estimate has changed. Please refresh the quote and try again.');
    }
    checkoutNote(dto) {
        return [
            dto.customerNote?.trim() || '',
            dto.fulfilmentMethod ? `Fulfilment: ${dto.fulfilmentMethod}` : '',
            dto.deliveryAddress ? `Delivery address: ${dto.deliveryAddress}` : '',
            dto.deliveryLandmark ? `Delivery landmark: ${dto.deliveryLandmark}` : '',
            dto.requestedDate ? `Requested date: ${dto.requestedDate}` : '',
            dto.artworkOption ? `Artwork option: ${dto.artworkOption}` : '',
            dto.artworkUrl ? `Artwork upload: ${dto.artworkUrl}${dto.artworkName ? ` (${dto.artworkName})` : ''}` : '',
            dto.artworkLink ? `Artwork link: ${dto.artworkLink}` : '',
        ].filter(Boolean).join('\n');
    }
    orderStatusForStage(stage) {
        const map = { artwork_review: 'artwork_review', proofing: 'awaiting_proof', production_ready: 'ready_for_production', in_production: 'in_production', quality_check: 'quality_check', ready: 'ready', fulfilled: 'completed', blocked: 'on_hold', cancelled: 'cancelled' };
        return map[stage] || null;
    }
    async uniqueNumber() { for (let i = 0; i < 10; i++) {
        const value = `VP-${(0, crypto_1.randomUUID)().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
        if (!await this.orders.existsBy({ orderNumber: value }))
            return value;
    } throw new common_1.BadRequestException('Could not create order number'); }
};
exports.OrderService = OrderService;
exports.OrderService = OrderService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.ServicePriceRule)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.Estimate)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.Order)),
    __param(3, (0, typeorm_1.InjectRepository)(entities_1.OrderItem)),
    __param(4, (0, typeorm_1.InjectRepository)(entities_1.ProductionJob)),
    __param(5, (0, typeorm_1.InjectRepository)(entities_1.ProductionJobActivity)),
    __param(6, (0, typeorm_1.InjectRepository)(entities_1.OrderStatusHistory)),
    __param(7, (0, typeorm_1.InjectRepository)(entities_1.OrderTrackingOtp)),
    __param(8, (0, typeorm_1.InjectRepository)(entities_1.NotificationOutbox)),
    __metadata("design:paramtypes", [typeorm_2.Repository, typeorm_2.Repository, typeorm_2.Repository, typeorm_2.Repository, typeorm_2.Repository, typeorm_2.Repository, typeorm_2.Repository, typeorm_2.Repository, typeorm_2.Repository, jwt_1.JwtService, notification_service_1.NotificationService, payment_service_1.PaymentService])
], OrderService);
//# sourceMappingURL=order.service.js.map