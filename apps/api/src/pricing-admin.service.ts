import { BadRequestException, Injectable, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { calculateLargeFormat } from '@vikipat/pricing-engine';
import { SavePricingDraftDto, TestPricingDraftDto } from './dto';
import { AuditLog, PricingRuleDraft, ServicePriceRule, ServicePriceRuleVersion } from './entities';

@Injectable()
export class PricingAdminService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(ServicePriceRule) private readonly rules: Repository<ServicePriceRule>,
    @InjectRepository(PricingRuleDraft) private readonly drafts: Repository<PricingRuleDraft>,
    @InjectRepository(ServicePriceRuleVersion) private readonly versions: Repository<ServicePriceRuleVersion>,
    private readonly dataSource: DataSource,
  ) {}

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

  async history(ruleId: string) {
    await this.rule(ruleId);
    return this.versions.find({ where: { ruleId }, order: { version: 'DESC' } });
  }

  async saveDraft(ruleId: string, dto: SavePricingDraftDto, actor: string) {
    const rule = await this.rule(ruleId);
    let draft = await this.drafts.findOneBy({ ruleId, status: 'draft' });
    if (!draft) draft = this.drafts.create({
      ruleId, code: rule.code, name: rule.name, material: rule.material, calculator: rule.calculator,
      baseVersion: rule.version, createdBy: actor, updatedBy: actor, status: 'draft', ...dto,
    });
    else Object.assign(draft, dto, { updatedBy: actor });
    const saved = await this.drafts.save(draft);
    await this.audit(actor, 'save_draft', 'pricing_rule', ruleId, { draftId: saved.id, baseVersion: saved.baseVersion, changeNote: dto.changeNote });
    return saved;
  }

  async testDraft(id: string, input: TestPricingDraftDto) {
    const draft = await this.draft(id);
    return calculateLargeFormat(this.engineRule(draft, draft.baseVersion + 1), {
      ...input, needsDesign: Boolean(input.needsDesign),
    });
  }

  async publish(id: string, actor: string) {
    return this.dataSource.transaction(async (manager) => {
      const draftRepo = manager.getRepository(PricingRuleDraft);
      const ruleRepo = manager.getRepository(ServicePriceRule);
      const draft = await draftRepo.findOneBy({ id, status: 'draft' });
      if (!draft) throw new NotFoundException('Pricing draft not found');
      const rule = this.dataSource.options.type === 'postgres'
        ? await ruleRepo.findOne({ where: { id: draft.ruleId }, lock: { mode: 'pessimistic_write' } })
        : await ruleRepo.findOneBy({ id: draft.ruleId });
      if (!rule) throw new NotFoundException('Pricing rule not found');
      if (rule.version !== draft.baseVersion) throw new BadRequestException('This draft is stale. Create a new draft from the current published version.');
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
      await manager.getRepository(ServicePriceRuleVersion).save(this.versionSnapshot(savedRule, actor));
      draft.status = 'published';
      await draftRepo.save(draft);
      await manager.getRepository(AuditLog).save(manager.getRepository(AuditLog).create({
        action: 'publish', entity: 'pricing_rule', entityId: rule.id, actorEmail: actor,
        details: JSON.stringify({ version: savedRule.version, draftId: draft.id, changeNote: draft.changeNote }),
      }));
      return savedRule;
    });
  }

  private async rule(id: string) {
    const rule = await this.rules.findOneBy({ id });
    if (!rule) throw new NotFoundException('Pricing rule not found');
    return rule;
  }

  private async draft(id: string) {
    const draft = await this.drafts.findOneBy({ id, status: 'draft' });
    if (!draft) throw new NotFoundException('Pricing draft not found');
    return draft;
  }

  private engineRule(source: ServicePriceRule | PricingRuleDraft, version: number) {
    return {
      serviceCode: source.code, serviceName: source.name, version,
      ratesPesewasPerSqFt: { online: source.onlineRatePesewas, walk_in: source.walkInRatePesewas, marketer: source.marketerRatePesewas, employee: source.employeeRatePesewas },
      designMinimumPesewas: source.designMinimumPesewas,
      roundingMode: source.roundingMode as 'nearest_cedi'|'up_to_cedi'|'exact_pesewa', roundingStage: 'line' as const,
    };
  }

  private versionSnapshot(rule: ServicePriceRule, actor: string) {
    return {
      ruleId: rule.id, code: rule.code, name: rule.name, material: rule.material, calculator: rule.calculator,
      version: rule.version, employeeRatePesewas: rule.employeeRatePesewas, marketerRatePesewas: rule.marketerRatePesewas,
      walkInRatePesewas: rule.walkInRatePesewas, onlineRatePesewas: rule.onlineRatePesewas,
      designMinimumPesewas: rule.designMinimumPesewas, roundingMode: rule.roundingMode, publishedBy: actor,
    };
  }

  private audit(actorEmail: string, action: string, entity: string, entityId: string, details: unknown) {
    return this.dataSource.getRepository(AuditLog).save({ actorEmail, action, entity, entityId, details: JSON.stringify(details) });
  }
}
