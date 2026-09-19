import { OnApplicationBootstrap } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { AuditLog, User } from './entities';
export declare class AuthService implements OnApplicationBootstrap {
    private users;
    private audits;
    private jwt;
    constructor(users: Repository<User>, audits: Repository<AuditLog>, jwt: JwtService);
    onApplicationBootstrap(): Promise<void>;
    login(email: string, password: string): Promise<{
        token: string;
        csrf: string;
        user: {
            email: string;
            name: string;
            role: import("@vikipat/domain").Role;
            permissions: readonly ("operations.read" | "jobs.release" | "jobs.assign" | "jobs.note" | "jobs.artwork" | "jobs.production" | "jobs.qc" | "jobs.dispatch" | "jobs.supervise")[];
            mustChangePassword: boolean;
        };
    }>;
    changePassword(id: string, email: string, currentPassword: string, newPassword: string): Promise<{
        success: boolean;
    }>;
    audit(actorEmail: string, action: string, entity: string, entityId?: string, details?: unknown): Promise<void>;
}
