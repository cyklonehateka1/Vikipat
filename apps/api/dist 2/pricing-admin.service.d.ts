import { OnApplicationBootstrap } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SavePricingDraftDto, TestPricingDraftDto } from './dto';
import { PricingRuleDraft, ServicePriceRule, ServicePriceRuleVersion } from './entities';
export declare class PricingAdminService implements OnApplicationBootstrap {
    private readonly rules;
    private readonly drafts;
    private readonly versions;
    private readonly dataSource;
    constructor(rules: Repository<ServicePriceRule>, drafts: Repository<PricingRuleDraft>, versions: Repository<ServicePriceRuleVersion>, dataSource: DataSource);
    onApplicationBootstrap(): Promise<void>;
    list(): Promise<{
        draft: PricingRuleDraft | null;
        id: string;
        code: string;
        name: string;
        material: string;
        calculator: string;
        employeeRatePesewas: number;
        marketerRatePesewas: number;
        walkInRatePesewas: number;
        onlineRatePesewas: number;
        version: number;
        designMinimumPesewas: number;
        roundingMode: "nearest_cedi" | "up_to_cedi" | "exact_pesewa";
        active: boolean;
        updatedAt: Date;
    }[]>;
    history(ruleId: string): Promise<ServicePriceRuleVersion[]>;
    saveDraft(ruleId: string, dto: SavePricingDraftDto, actor: string): Promise<PricingRuleDraft>;
    testDraft(id: string, input: TestPricingDraftDto): Promise<import("@vikipat/pricing-engine").LargeFormatEstimate>;
    publish(id: string, actor: string): Promise<ServicePriceRule>;
    private rule;
    private draft;
    private engineRule;
    private versionSnapshot;
    private audit;
}
