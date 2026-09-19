import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from './entities';
export type AuthUser = {
    id: string;
    email: string;
    name: string;
    role: string;
    permissions: readonly string[];
    csrf: string;
    tokenVersion: number;
    mustChangePassword: boolean;
};
declare module 'express-serve-static-core' {
    interface Request {
        user?: AuthUser;
    }
}
export declare class AuthGuard implements CanActivate {
    private jwt;
    private users;
    constructor(jwt: JwtService, users: Repository<User>);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
export declare class PasswordChangedGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
export declare class CsrfGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
export declare class AdminOnlyGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
export declare class OperationsGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
