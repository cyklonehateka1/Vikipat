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
exports.OperationsGuard = exports.AdminOnlyGuard = exports.CsrfGuard = exports.PasswordChangedGuard = exports.AuthGuard = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const typeorm_2 = require("typeorm");
const domain_1 = require("@vikipat/domain");
const entities_1 = require("./entities");
let AuthGuard = class AuthGuard {
    constructor(jwt, users) {
        this.jwt = jwt;
        this.users = users;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const token = request.cookies?.admin_session;
        if (!token)
            throw new common_1.UnauthorizedException('Authentication required');
        try {
            const payload = await this.jwt.verifyAsync(token, { issuer: 'vikipat-api', audience: 'vikipat-admin' });
            const user = await this.users.findOneBy({ id: payload.id });
            if (!user || user.tokenVersion !== payload.tokenVersion || !user.isActive || !(0, domain_1.isRole)(user.role))
                throw new common_1.UnauthorizedException('Session is no longer valid');
            request.user = { ...payload, email: user.email, name: user.name, role: user.role, permissions: (0, domain_1.permissionsForRole)(user.role), mustChangePassword: user.mustChangePassword };
            return true;
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException)
                throw error;
            throw new common_1.UnauthorizedException('Session expired');
        }
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.User)),
    __metadata("design:paramtypes", [jwt_1.JwtService, typeorm_2.Repository])
], AuthGuard);
let PasswordChangedGuard = class PasswordChangedGuard {
    canActivate(context) {
        const user = context.switchToHttp().getRequest().user;
        if (user?.mustChangePassword)
            throw new common_1.ForbiddenException('Password change required');
        return true;
    }
};
exports.PasswordChangedGuard = PasswordChangedGuard;
exports.PasswordChangedGuard = PasswordChangedGuard = __decorate([
    (0, common_1.Injectable)()
], PasswordChangedGuard);
let CsrfGuard = class CsrfGuard {
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        if (['GET', 'HEAD', 'OPTIONS'].includes(request.method))
            return true;
        const provided = request.headers['x-csrf-token'];
        if (!provided || provided !== request.user?.csrf)
            throw new common_1.ForbiddenException('Invalid CSRF token');
        return true;
    }
};
exports.CsrfGuard = CsrfGuard;
exports.CsrfGuard = CsrfGuard = __decorate([
    (0, common_1.Injectable)()
], CsrfGuard);
let AdminOnlyGuard = class AdminOnlyGuard {
    canActivate(context) {
        if (context.switchToHttp().getRequest().user?.role !== 'admin') {
            throw new common_1.ForbiddenException('Administrator access required');
        }
        return true;
    }
};
exports.AdminOnlyGuard = AdminOnlyGuard;
exports.AdminOnlyGuard = AdminOnlyGuard = __decorate([
    (0, common_1.Injectable)()
], AdminOnlyGuard);
let OperationsGuard = class OperationsGuard {
    canActivate(context) {
        if (!context.switchToHttp().getRequest().user?.permissions.includes('operations.read')) {
            throw new common_1.ForbiddenException('Operations access required');
        }
        return true;
    }
};
exports.OperationsGuard = OperationsGuard;
exports.OperationsGuard = OperationsGuard = __decorate([
    (0, common_1.Injectable)()
], OperationsGuard);
//# sourceMappingURL=security.js.map