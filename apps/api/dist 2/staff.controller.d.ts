import { Request } from 'express';
import { CreateStaffDto, UpdateStaffDto } from './staff.dto';
import { StaffService } from './staff.service';
export declare class StaffController {
    private staff;
    constructor(staff: StaffService);
    list(): Promise<{
        staff: {
            id: string;
            email: string;
            name: string;
            role: string;
            isActive: boolean;
            mustChangePassword: boolean;
        }[];
        roles: readonly ["operations_supervisor", "designer", "production_operator", "quality_control", "dispatch"];
    }>;
    create(dto: CreateStaffDto, request: Request): Promise<{
        id: string;
        email: string;
        name: string;
        role: string;
        isActive: boolean;
        mustChangePassword: boolean;
    }>;
    update(id: string, dto: UpdateStaffDto, request: Request): Promise<{
        id: string;
        email: string;
        name: string;
        role: string;
        isActive: boolean;
        mustChangePassword: boolean;
    }>;
}
