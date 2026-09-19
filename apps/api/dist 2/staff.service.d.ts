import { Repository } from 'typeorm';
import { User } from './entities';
import { CreateStaffDto, UpdateStaffDto } from './staff.dto';
export declare class StaffService {
    private users;
    constructor(users: Repository<User>);
    list(): Promise<{
        id: string;
        email: string;
        name: string;
        role: string;
        isActive: boolean;
        mustChangePassword: boolean;
    }[]>;
    create(dto: CreateStaffDto, actor: string): Promise<{
        id: string;
        email: string;
        name: string;
        role: string;
        isActive: boolean;
        mustChangePassword: boolean;
    }>;
    update(id: string, dto: UpdateStaffDto, actorId: string, actor: string): Promise<{
        id: string;
        email: string;
        name: string;
        role: string;
        isActive: boolean;
        mustChangePassword: boolean;
    }>;
}
