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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const bcryptjs_1 = require("bcryptjs");
const crypto_1 = require("crypto");
const typeorm_2 = require("typeorm");
const domain_1 = require("@vikipat/domain");
const entities_1 = require("./entities");
let AuthService = class AuthService {
    constructor(users, audits, jwt) {
        this.users = users;
        this.audits = audits;
        this.jwt = jwt;
    }
    async onApplicationBootstrap() { const email = (process.env.ADMIN_EMAIL || 'hello@vikipat.com').toLowerCase(); if (!await this.users.findOneBy({ email })) {
        const password = process.env.ADMIN_PASSWORD || 'ChangeMe@VP2026!';
        await this.users.save(this.users.create({ email, name: 'Studio Admin', passwordHash: await (0, bcryptjs_1.hash)(password, 12), mustChangePassword: true, role: 'admin' }));
        console.log(`[bootstrap] Default admin created: ${email}. Change the password immediately.`);
    } }
    async login(email, password) { const user = await this.users.findOneBy({ email: email.toLowerCase() }); if (!user || !user.isActive || !(0, domain_1.isRole)(user.role) || !await (0, bcryptjs_1.compare)(password, user.passwordHash))
        throw new common_1.UnauthorizedException('Invalid email or password'); const csrf = (0, crypto_1.randomBytes)(32).toString('hex'); const token = await this.jwt.signAsync({ id: user.id, email: user.email, role: user.role, csrf, tokenVersion: user.tokenVersion, mustChangePassword: user.mustChangePassword }, { expiresIn: '8h' }); await this.audit(user.email, 'login', 'session', user.id); return { token, csrf, user: { email: user.email, name: user.name, role: user.role, permissions: (0, domain_1.permissionsForRole)(user.role), mustChangePassword: user.mustChangePassword } }; }
    async changePassword(id, email, currentPassword, newPassword) { const user = await this.users.findOneByOrFail({ id }); if (!await (0, bcryptjs_1.compare)(currentPassword, user.passwordHash))
        throw new common_1.UnauthorizedException('Current password is incorrect'); user.passwordHash = await (0, bcryptjs_1.hash)(newPassword, 12); user.mustChangePassword = false; user.tokenVersion += 1; await this.users.save(user); await this.audit(email, 'change_password', 'user', id); return { success: true }; }
    async audit(actorEmail, action, entity, entityId = '', details = {}) { await this.audits.save(this.audits.create({ actorEmail, action, entity, entityId, details: JSON.stringify(details) })); }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.AuditLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository, typeorm_2.Repository, jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map