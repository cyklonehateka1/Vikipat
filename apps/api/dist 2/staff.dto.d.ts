import { StaffRole } from '@vikipat/domain';
export declare class CreateStaffDto {
    email: string;
    name: string;
    role: StaffRole;
    temporaryPassword: string;
}
export declare class UpdateStaffDto {
    role: StaffRole;
    isActive: boolean;
}
