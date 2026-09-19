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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("./entities");
const auth_service_1 = require("./auth.service");
const catalog_seed_1 = require("./catalog.seed");
let AdminService = class AdminService {
    constructor(products, stocks, settings, audits, quotes, auth) {
        this.products = products;
        this.stocks = stocks;
        this.settings = settings;
        this.audits = audits;
        this.quotes = quotes;
        this.auth = auth;
    }
    async onApplicationBootstrap() { for (const seed of catalog_seed_1.SEED_PRODUCTS) {
        const existing = await this.products.findOneBy({ name: seed.name });
        if (existing) {
            Object.assign(existing, { category: seed.category });
            await this.products.save(existing);
        }
        else
            await this.products.save(this.products.create(seed));
    } if (await this.settings.count() === 0)
        await this.settings.save(this.settings.create()); }
    list(q) { return this.products.find({ where: q ? { name: (0, typeorm_2.Like)(`%${q}%`) } : {}, order: { createdAt: 'DESC' } }); }
    async publicCatalog() {
        const products = await this.products.find({ where: { status: 'Active' }, order: { featured: 'DESC', createdAt: 'DESC' } });
        const settings = await this.getSettings();
        return { products: products.map(({ status, ...product }) => product), settings: { businessName: settings.businessName, phone: settings.phone, location: settings.location, currency: settings.currency, description: settings.description, updatedAt: settings.updatedAt } };
    }
    async publicProduct(id) {
        const product = await this.products.findOneBy({ id, status: 'Active' });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        const { status, ...result } = product;
        return result;
    }
    async one(id) { const product = await this.products.findOneBy({ id }); if (!product)
        throw new common_1.NotFoundException('Product not found'); return product; }
    async create(dto, email) { const product = await this.products.save(this.products.create({ ...dto, image: dto.image || '', status: dto.status || 'Active', featured: dto.featured || false })); await this.auth.audit(email, 'create', 'product', product.id, { name: product.name }); return product; }
    async update(id, dto, email) { const product = await this.one(id); const previousStock = product.stock; Object.assign(product, dto); const saved = await this.products.save(product); if (dto.stock !== undefined && dto.stock !== previousStock)
        await this.recordStock(saved, previousStock, dto.stock, 'Product update', email); await this.auth.audit(email, 'update', 'product', id, dto); return saved; }
    async remove(id, email) { const product = await this.one(id); await this.products.remove(product); await this.auth.audit(email, 'delete', 'product', id, { name: product.name }); return { success: true }; }
    async adjust(id, dto, email) { const product = await this.one(id); const previous = product.stock; product.stock = dto.stock; await this.products.save(product); await this.recordStock(product, previous, dto.stock, dto.reason, email); await this.auth.audit(email, 'adjust_stock', 'product', id, dto); return product; }
    recordStock(product, previousStock, newStock, reason, actorEmail) { return this.stocks.save(this.stocks.create({ productId: product.id, productName: product.name, previousStock, newStock, reason, actorEmail })); }
    stockActivity() { return this.stocks.find({ order: { createdAt: 'DESC' }, take: 100 }); }
    async summary() { const all = await this.products.find(); return { totalProducts: all.length, activeProducts: all.filter(p => p.status === 'Active').length, lowStock: all.filter(p => p.stock < 10).length, categories: new Set(all.map(p => p.category)).size, totalStock: all.reduce((sum, p) => sum + p.stock, 0), catalogueHealth: all.length ? Math.round(all.filter(p => p.status === 'Active' && p.image && p.description).length / all.length * 100) : 0, newQuotes: await this.quotes.countBy({ status: 'New' }) }; }
    async insights() { const all = await this.products.find(); const audit = await this.audits.find({ order: { createdAt: 'ASC' } }); const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (6 - index)); return date; }); const weeklyActivity = days.map((day, index) => { const end = index === 6 ? new Date() : days[index + 1]; return audit.filter(item => item.createdAt >= day && item.createdAt < end).length; }); const max = Math.max(...weeklyActivity, 1); return { summary: await this.summary(), categoryMix: catalog_seed_1.CATEGORIES.map(name => ({ name, count: all.filter(p => p.category === name).length })), weeklyViews: weeklyActivity.map(value => Math.round(value / max * 100)), weeklyActivity, generatedAt: new Date().toISOString() }; }
    async activity() { const audit = await this.audits.find({ order: { createdAt: 'DESC' }, take: 20 }); return audit.map(item => ({ ...item, details: JSON.parse(item.details) })); }
    async getSettings() { return (await this.settings.find({ take: 1 }))[0]; }
    async updateSettings(dto, email) { const settings = await this.getSettings(); Object.assign(settings, dto); const saved = await this.settings.save(settings); await this.auth.audit(email, 'update', 'settings', saved.id, dto); return saved; }
    async createQuote(dto) { const { website, ...data } = dto; if (website)
        return { success: true }; if (data.artworkUrl) {
        const origin = process.env.API_PUBLIC_URL || 'http://localhost:3000';
        if (!data.artworkUrl.startsWith(origin + '/uploads/'))
            throw new common_1.BadRequestException('Invalid artwork URL');
    } const quote = await this.quotes.save(this.quotes.create({ ...data, status: 'New' })); await this.auth.audit('storefront', 'create', 'quote', quote.id, { name: quote.name, need: quote.need }); return { success: true, id: quote.id }; }
    listQuotes() { return this.quotes.find({ order: { createdAt: 'DESC' }, take: 250 }); }
    async updateQuoteStatus(id, status, email) { const quote = await this.quotes.findOneBy({ id }); if (!quote)
        throw new common_1.NotFoundException('Quote request not found'); quote.status = status; const saved = await this.quotes.save(quote); await this.auth.audit(email, 'update_status', 'quote', id, { status }); return saved; }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Product)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.StockActivity)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.StoreSettings)),
    __param(3, (0, typeorm_1.InjectRepository)(entities_1.AuditLog)),
    __param(4, (0, typeorm_1.InjectRepository)(entities_1.QuoteRequest)),
    __metadata("design:paramtypes", [typeorm_2.Repository, typeorm_2.Repository, typeorm_2.Repository, typeorm_2.Repository, typeorm_2.Repository, auth_service_1.AuthService])
], AdminService);
//# sourceMappingURL=admin.service.js.map