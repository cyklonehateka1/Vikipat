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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var NotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const nodemailer_1 = __importDefault(require("nodemailer"));
const typeorm_2 = require("typeorm");
const entities_1 = require("./entities");
let NotificationService = NotificationService_1 = class NotificationService {
    constructor(outbox, settings) {
        this.outbox = outbox;
        this.settings = settings;
        this.logger = new common_1.Logger(NotificationService_1.name);
    }
    async queueEmail(order, template, payload) {
        const record = await this.outbox.save(this.outbox.create({ orderId: order.id, channel: 'email', recipient: order.customerEmail, template, payload: JSON.stringify(payload) }));
        await this.deliver(record);
    }
    async queueWhatsApp(order, template, payload) {
        if (!order.customerPhone)
            return;
        const config = (await this.settings.find({ take: 1 }))[0];
        if (!config?.whatsappNotificationsEnabled)
            return;
        const record = await this.outbox.save(this.outbox.create({ orderId: order.id, channel: 'whatsapp', recipient: order.customerPhone, template, payload: JSON.stringify(payload) }));
        await this.deliver(record);
    }
    async deliver(record) {
        try {
            record.attempts += 1;
            if (record.channel === 'email')
                await this.sendEmail(record);
            else
                await this.sendWhatsApp(record);
            record.status = 'sent';
            record.lastError = '';
        }
        catch (error) {
            record.status = 'failed';
            record.lastError = error instanceof Error ? error.message.slice(0, 500) : 'Delivery failed';
            this.logger.warn(`${record.channel} notification ${record.id} failed: ${record.lastError}`);
        }
        await this.outbox.save(record);
    }
    async sendEmail(record) {
        const host = process.env.SMTP_HOST;
        if (!host)
            throw new Error('SMTP is not configured');
        const payload = JSON.parse(record.payload);
        const transport = nodemailer_1.default.createTransport({ host, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined });
        await transport.sendMail({ from: process.env.EMAIL_FROM || 'Vikipat <orders@vikipat.com>', to: record.recipient, subject: payload.subject || 'Your Vikipat order', text: payload.text || '' });
    }
    async sendWhatsApp(record) {
        if (!process.env.WHATSAPP_API_URL || !process.env.WHATSAPP_ACCESS_TOKEN)
            throw new Error('WhatsApp API is not configured');
        const response = await fetch(process.env.WHATSAPP_API_URL, { method: 'POST', headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ to: record.recipient, template: record.template, parameters: JSON.parse(record.payload) }) });
        if (!response.ok)
            throw new Error(`WhatsApp provider returned ${response.status}`);
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.NotificationOutbox)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.StoreSettings)),
    __metadata("design:paramtypes", [typeorm_2.Repository, typeorm_2.Repository])
], NotificationService);
//# sourceMappingURL=notification.service.js.map