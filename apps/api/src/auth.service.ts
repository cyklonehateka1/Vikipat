import { Injectable, OnApplicationBootstrap, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { isRole, permissionsForRole } from '@vikipat/domain';
import { AuditLog, User } from './entities';
@Injectable() export class AuthService implements OnApplicationBootstrap {
  constructor(@InjectRepository(User) private users:Repository<User>,@InjectRepository(AuditLog) private audits:Repository<AuditLog>,private jwt:JwtService){}
  async onApplicationBootstrap(){const email=(process.env.ADMIN_EMAIL||'hello@vikipat.com').toLowerCase();if(!await this.users.findOneBy({email})){const password=process.env.ADMIN_PASSWORD||'ChangeMe@VP2026!';await this.users.save(this.users.create({email,name:'Studio Admin',passwordHash:await hash(password,12),mustChangePassword:true,role:'admin'}));console.log(`[bootstrap] Default admin created: ${email}. Change the password immediately.`)}}
  async login(email:string,password:string){const user=await this.users.findOneBy({email:email.toLowerCase()});if(!user||!user.isActive||!isRole(user.role)||!await compare(password,user.passwordHash))throw new UnauthorizedException('Invalid email or password');const csrf=randomBytes(32).toString('hex');const token=await this.jwt.signAsync({id:user.id,email:user.email,role:user.role,csrf,tokenVersion:user.tokenVersion,mustChangePassword:user.mustChangePassword},{expiresIn:'8h'});await this.audit(user.email,'login','session',user.id);return{token,csrf,user:{email:user.email,name:user.name,role:user.role,permissions:permissionsForRole(user.role),mustChangePassword:user.mustChangePassword}}}
  async changePassword(id:string,email:string,currentPassword:string,newPassword:string){const user=await this.users.findOneByOrFail({id});if(!await compare(currentPassword,user.passwordHash))throw new UnauthorizedException('Current password is incorrect');user.passwordHash=await hash(newPassword,12);user.mustChangePassword=false;user.tokenVersion+=1;await this.users.save(user);await this.audit(email,'change_password','user',id);return{success:true}}
  async audit(actorEmail:string,action:string,entity:string,entityId='',details:unknown={}){await this.audits.save(this.audits.create({actorEmail,action,entity,entityId,details:JSON.stringify(details)}))}
}
