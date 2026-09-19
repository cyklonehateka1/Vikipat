import { Request } from 'express';
import { SavePricingDraftDto, TestPricingDraftDto } from './dto';
import { PricingAdminService } from './pricing-admin.service';
export declare class PricingAdminController {
    private readonly pricing;
    constructor(pricing: PricingAdminService);
    list(): Promise<{
        draft: import("./entities").PricingRuleDraft | null;
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
    history(id: string): Promise<import("./entities").ServicePriceRuleVersion[]>;
    saveDraft(req: Request, id: string, dto: SavePricingDraftDto): Promise<import("./entities").PricingRuleDraft>;
    test(id: string, dto: TestPricingDraftDto): Promise<import("@vikipat/pricing-engine").LargeFormatEstimate>;
    publish(req: Request, id: string): Promise<import("./entities").ServicePriceRule>;
}
