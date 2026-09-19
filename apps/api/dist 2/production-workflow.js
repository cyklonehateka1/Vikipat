"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowedProductionStages = allowedProductionStages;
exports.permittedProductionStages = permittedProductionStages;
const domain_1 = require("@vikipat/domain");
const NEXT_STAGES = {
    intake: ['artwork_review', 'blocked', 'cancelled'],
    artwork_review: ['proofing', 'production_ready', 'blocked', 'cancelled'],
    proofing: ['artwork_review', 'production_ready', 'blocked', 'cancelled'],
    production_ready: ['in_production', 'artwork_review', 'blocked', 'cancelled'],
    in_production: ['quality_check', 'blocked', 'cancelled'],
    quality_check: ['ready', 'in_production', 'blocked', 'cancelled'],
    ready: ['fulfilled', 'quality_check', 'blocked', 'cancelled'],
    fulfilled: [],
    blocked: ['artwork_review', 'cancelled'],
    cancelled: [],
};
function allowedProductionStages(stage) {
    return [stage, ...(NEXT_STAGES[stage] ?? [])];
}
function permittedProductionStages(stage, role) {
    if (!(0, domain_1.hasPermission)(role, 'operations.read'))
        return [];
    return allowedProductionStages(stage).filter(next => {
        if (next === stage || (0, domain_1.hasPermission)(role, 'jobs.supervise'))
            return true;
        if (next === 'cancelled')
            return false;
        if (['intake', 'artwork_review', 'proofing'].includes(stage) || (stage === 'production_ready' && next === 'artwork_review'))
            return (0, domain_1.hasPermission)(role, 'jobs.artwork');
        if (['production_ready', 'in_production'].includes(stage))
            return (0, domain_1.hasPermission)(role, 'jobs.production');
        if (stage === 'quality_check')
            return (0, domain_1.hasPermission)(role, 'jobs.qc');
        if (stage === 'ready')
            return (0, domain_1.hasPermission)(role, 'jobs.dispatch');
        return false;
    });
}
//# sourceMappingURL=production-workflow.js.map