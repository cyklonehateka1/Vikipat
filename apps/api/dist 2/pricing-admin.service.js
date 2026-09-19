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
exports.PricingAdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const pricing_engine_1 = require("@vikipat/pricing-engine");
const entities_1 = require("./entities");
let PricingAdminService = class PricingAdminService {
    constructor(rules, drafts, versions, dataSource) {
        this.rules = rules;
        this.drafts = drafts;
        this.versions = versions;
        this.dataSource = dataSource;
    }
    async onApplicationBootstrap() {
        const rules = await this.rules.find();
        for (const rule of rules) {
            if (!await this.versions.existsBy({ ruleId: rule.id, version: rule.version })) {
                await this.versions.save(this.versions.create(this.versionSnapshot(rule, 'system:initial-import')));
            }
        }
    }
    async list() {
        const rules = await this.rules.find({ order: { name: 'ASC' } });
        const openDrafts = await this.drafts.find({ where: { status: 'draft' } });
        const byRule = new Map(openDrafts.map((draft) => [draft.ruleId, draft]));
        return rules.map((rule) => ({ ...rule, draft: byRule.get(rule.id) ?? null }));
    }
    async history(ruleId) {
        await this.rule(ruleId);
        return this.versions.find({ where: { ruleId }, order: { version: 'DESC' } });
    }
    async saveDraft(ruleId, dto, actor) {
        const rule = await this.rule(ruleId);
        let draft = await this.drafts.findOneBy({ ruleId, status: 'draft' });
        if (!draft)
            draft = this.drafts.create({
                ruleId, code: rule.code, name: rule.name, material: rule.material, calculator: rule.calculator,
                baseVersion: rule.version, createdBy: actor, updatedBy: actor, status: 'draft', ...dto,
            });
        else
            Object.assign(draft, dto, { updatedBy: actor });
        const saved = await this.drafts.save(draft);
        await this.audit(actor, 'save_draft', 'pricing_rule', ruleId, { draftId: saved.id, baseVersion: saved.baseVersion, changeNote: dto.changeNote });
        return saved;
    }
    async testDraft(id, input) {
        const draft = await this.draft(id);
        return (0, pricing_engine_1.calculateLargeFormat)(this.engineRule(draft, draft.baseVersion + 1), {
            ...input, needsDesign: Boolean(input.needsDesign),
        });
    }
    async publish(id, actor) {
        return this.dataSource.transaction(async (manager) => {
            const draftRepo = manager.getRepository(entities_1.PricingRuleDraft);
            const ruleRepo = manager.getRepository(entities_1.ServicePriceRule);
            const draft = await draftRepo.findOneBy({ id, status: 'draft' });
            if (!draft)
                throw new common_1.NotFoundException('Pricing draft not found');
            const rule = this.dataSource.options.type === 'postgres'
                ? await ruleRepo.findOne({ where: { id: draft.ruleId }, lock: { mode: 'pessimistic_write' } })
                : await ruleRepo.findOneBy({ id: draft.ruleId });
            if (!rule)
                throw new common_1.NotFoundException('Pricing rule not found');
            if (rule.version !== draft.baseVersion)
                throw new common_1.BadRequestException('This draft is stale. Create a new draft from the current published version.');
            Object.assign(rule, {
                employeeRatePesewas: draft.employeeRatePesewas,
                marketerRatePesewas: draft.marketerRatePesewas,
                walkInRatePesewas: draft.walkInRatePesewas,
                onlineRatePesewas: draft.onlineRatePesewas,
                designMinimumPesewas: draft.designMinimumPesewas,
                roundingMode: draft.roundingMode,
                version: rule.version + 1,
            });
            const savedRule = await ruleRepo.save(rule);
            await manager.getRepository(entities_1.ServicePriceRuleVersion).save(this.versionSnapshot(savedRule, actor));
            draft.status = 'published';
            await draftRepo.save(draft);
            await manager.getRepository(entities_1.AuditLog).save(manager.getRepository(entities_1.AuditLog).create({
                action: 'publish', entity: 'pricing_rule', entityId: rule.id, actorEmail: actor,
                details: JSON.stringify({ version: savedRule.version, draftId: draft.id, changeNote: draft.changeNote }),
            }));
            return savedRule;
        });
    }
    async rule(id) {
        const rule = await this.rules.findOneBy({ id });
        if (!rule)
            throw new common_1.NotFoundException('Pricing rule not found');
        return rule;
    }
    async draft(id) {
        const draft = await this.drafts.findOneBy({ id, status: 'draft' });
        if (!draft)
            throw new common_1.NotFoundException('Pricing draft not found');
        return draft;
    }
    engineRule(source, version) {
        return {
            serviceCode: source.code, serviceName: source.name, version,
            ratesPesewasPerSqFt: { online: source.onlineRatePesewas, walk_in: source.walkInRatePesewas, marketer: source.marketerRatePesewas, employee: source.employeeRatePesewas },
            designMinimumPesewas: source.designMinimumPesewas,
            roundingMode: source.roundingMode, roundingStage: 'line',
        };
    }
    versionSnapshot(rule, actor) {
        return {
            ruleId: rule.id, code: rule.code, name: rule.name, material: rule.material, calculator: rule.calculator,
            version: rule.version, employeeRatePesewas: rule.employeeRatePesewas, marketerRatePesewas: rule.marketerRatePesewas,
            walkInRatePesewas: rule.walkInRatePesewas, onlineRatePesewas: rule.onlineRatePesewas,
            designMinimumPesewas: rule.designMinimumPesewas, roundingMode: rule.roundingMode, publishedBy: actor,
        };
    }
    audit(actorEmail, action, entity, entityId, details) {
        return this.dataSource.getRepository(entities_1.AuditLog).save({ actorEmail, action, entity, entityId, details: JSON.stringify(details) });
    }
};
exports.PricingAdminService = PricingAdminService;
exports.PricingAdminService = PricingAdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.ServicePriceRule)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.PricingRuleDraft)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.ServicePriceRuleVersion)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], PricingAdminService);
//# sourceMappingURL=pricing-admin.service.js.map