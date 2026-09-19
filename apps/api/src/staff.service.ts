import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { lockedFindOne } from './db';
import { AuditLog, User } from './entities';
import { CreateStaffDto, UpdateStaffDto } from './staff.dto';

const safeStaff = ({id, email, name, role, isActive, mustChangePassword}: User) => ({id, email, name, role, isActive, mustChangePassword});

@Injectable()
export class StaffService {
  constructor(@InjectRepository(User) private users: Repository<User>) {}

  async list() {
    return (await this.users.find({order: {name: 'ASC'}})).map(safeStaff);
  }

  async create(dto: CreateStaffDto, actor: string) {
    const passwordHash = await hash(dto.temporaryPassword, 12);
    try {
      return await this.users.manager.transaction(async manager => {
        const users = manager.getRepository(User);
        const user = await users.save(users.create({email: dto.email.trim().toLowerCase(), name: dto.name.trim(), role: dto.role, passwordHash, isActive: true, mustChangePassword: true}));
        await manager.getRepository(AuditLog).save({actorEmail: actor, action: 'staff_created', entity: 'user', entityId: user.id, details: JSON.stringify({email: user.email, role: user.role})});
        return safeStaff(user);
      });
    } catch (error) {
      if ((error as {code?: string}).code === '23505') throw new ConflictException('An account already uses this email');
      throw error;
    }
  }

  async update(id: string, dto: UpdateStaffDto, actorId: string, actor: string) {
    if (id === actorId) throw new BadRequestException('You cannot change your own access');
    return this.users.manager.transaction(async manager => {
      const users = manager.getRepository(User);
      const user = await lockedFindOne(manager, User, {id});
      if (!user) throw new NotFoundException('Staff account not found');
      if (user.role === 'admin') throw new BadRequestException('Administrator accounts cannot be changed in staff management');
      const before = {role: user.role, isActive: user.isActive};
      user.role = dto.role;
      user.isActive = dto.isActive;
      if (before.role === user.role && before.isActive === user.isActive) return safeStaff(user);
      user.tokenVersion += 1;
      await users.save(user);
      await manager.getRepository(AuditLog).save({actorEmail: actor, action: 'staff_access_updated', entity: 'user', entityId: id, details: JSON.stringify({before, after: {role: user.role, isActive: user.isActive}})});
      return safeStaff(user);
    });
  }
}
