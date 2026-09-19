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
exports.StaffService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const bcryptjs_1 = require("bcryptjs");
const typeorm_2 = require("typeorm");
const entities_1 = require("./entities");
const safeStaff = ({ id, email, name, role, isActive, mustChangePassword }) => ({ id, email, name, role, isActive, mustChangePassword });
let StaffService = class StaffService {
    constructor(users) {
        this.users = users;
    }
    async list() {
        return (await this.users.find({ order: { name: 'ASC' } })).map(safeStaff);
    }
    async create(dto, actor) {
        const passwordHash = await (0, bcryptjs_1.hash)(dto.temporaryPassword, 12);
        try {
            return await this.users.manager.transaction(async (manager) => {
                const users = manager.getRepository(entities_1.User);
                const user = await users.save(users.create({ email: dto.email.trim().toLowerCase(), name: dto.name.trim(), role: dto.role, passwordHash, isActive: true, mustChangePassword: true }));
                await manager.getRepository(entities_1.AuditLog).save({ actorEmail: actor, action: 'staff_created', entity: 'user', entityId: user.id, details: JSON.stringify({ email: user.email, role: user.role }) });
                return safeStaff(user);
            });
        }
        catch (error) {
            if (error.code === '23505')
                throw new common_1.ConflictException('An account already uses this email');
            throw error;
        }
    }
    async update(id, dto, actorId, actor) {
        if (id === actorId)
            throw new common_1.BadRequestException('You cannot change your own access');
        return this.users.manager.transaction(async (manager) => {
            const users = manager.getRepository(entities_1.User);
            const user = await users.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
            if (!user)
                throw new common_1.NotFoundException('Staff account not found');
            if (user.role === 'admin')
                throw new common_1.BadRequestException('Administrator accounts cannot be changed in staff management');
            const before = { role: user.role, isActive: user.isActive };
            user.role = dto.role;
            user.isActive = dto.isActive;
            if (before.role === user.role && before.isActive === user.isActive)
                return safeStaff(user);
            user.tokenVersion += 1;
            await users.save(user);
            await manager.getRepository(entities_1.AuditLog).save({ actorEmail: actor, action: 'staff_access_updated', entity: 'user', entityId: id, details: JSON.stringify({ before, after: { role: user.role, isActive: user.isActive } }) });
            return safeStaff(user);
        });
    }
};
exports.StaffService = StaffService;
exports.StaffService = StaffService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], StaffService);
//# sourceMappingURL=staff.service.js.map