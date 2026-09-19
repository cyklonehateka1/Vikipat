"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffAccessSchema1720000004000 = void 0;
class StaffAccessSchema1720000004000 {
    constructor() {
        this.name = 'StaffAccessSchema1720000004000';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isActive" boolean NOT NULL DEFAULT true`);
    }
    async down(queryRunner) {
        await queryRunner.query(`UPDATE "users" SET "tokenVersion" = "tokenVersion" + 1`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "isActive"`);
    }
}
exports.StaffAccessSchema1720000004000 = StaffAccessSchema1720000004000;
//# sourceMappingURL=1720000004000-StaffAccessSchema.js.map