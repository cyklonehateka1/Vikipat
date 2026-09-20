import { Injectable, OnApplicationBootstrap, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { isRole, permissionsForRole } from '@vikipat/domain';
import { AuditLog, PasswordResetToken, User } from './entities';
import { MailService } from './mail.service';
@Injectable() export class AuthService implements OnApplicationBootstrap {
  constructor(@InjectRepository(User) private users:Repository<User>,@InjectRepository(AuditLog) private audits:Repository<AuditLog>,@InjectRepository(PasswordResetToken) private resets:Repository<PasswordResetToken>,private jwt:JwtService,private mail:MailService){}
  async onApplicationBootstrap(){const email=(process.env.ADMIN_EMAIL||'hello@vikipat.com').toLowerCase();if(!await this.users.findOneBy({email})){const password=process.env.ADMIN_PASSWORD||'ChangeMe@VP2026!';await this.users.save(this.users.create({email,name:'Studio Admin',passwordHash:await hash(password,12),mustChangePassword:true,role:'admin'}));console.log(`[bootstrap] Default admin created: ${email}. Change the password immediately.`)}}
  async login(email:string,password:string){const user=await this.users.findOneBy({email:email.toLowerCase()});if(!user||!user.isActive||!isRole(user.role)||!await compare(password,user.passwordHash))throw new UnauthorizedException('Invalid email or password');const csrf=randomBytes(32).toString('hex');const token=await this.jwt.signAsync({id:user.id,email:user.email,role:user.role,csrf,tokenVersion:user.tokenVersion,mustChangePassword:user.mustChangePassword},{expiresIn:'8h'});await this.audit(user.email,'login','session',user.id);return{token,csrf,user:{email:user.email,name:user.name,role:user.role,permissions:permissionsForRole(user.role),mustChangePassword:user.mustChangePassword}}}
  async changePassword(id:string,email:string,currentPassword:string,newPassword:string){const user=await this.users.findOneByOrFail({id});if(!await compare(currentPassword,user.passwordHash))throw new UnauthorizedException('Current password is incorrect');user.passwordHash=await hash(newPassword,12);user.mustChangePassword=false;user.tokenVersion+=1;await this.users.save(user);await this.audit(email,'change_password','user',id);return{success:true}}

  /** Only the hash is stored, so a leaked table cannot be used to reset anyone. */
  private hashToken(token:string){return createHash('sha256').update(token).digest('hex')}

  /**
   * Always reports success. Saying "no account with that email" would turn
   * this endpoint into a way to enumerate who works here.
   */
  async requestPasswordReset(email:string,ip=''){
    const user=await this.users.findOneBy({email:email.trim().toLowerCase()});
    if(user&&user.isActive){
      // Any earlier outstanding link stops working the moment a new one is asked for.
      await this.resets.update({userId:user.id,usedAt:IsNull()},{usedAt:new Date()});
      const token=randomBytes(32).toString('hex');
      await this.resets.save(this.resets.create({userId:user.id,tokenHash:this.hashToken(token),expiresAt:new Date(Date.now()+60*60*1000),requestedIp:ip}));
      const link=`${(process.env.ADMIN_PUBLIC_URL||'http://localhost:5174').replace(/\/$/,'')}/reset-password?token=${token}`;
      await this.mail.trySend({to:user.email,subject:'Reset your Vikipat password',
        text:`Hello ${user.name},\n\nSomeone asked to reset the password for your Vikipat studio account. Use the link below within the next hour:\n\n${link}\n\nIf this was not you, ignore this email and your password stays as it is.`});
      await this.audit(user.email,'password_reset_requested','user',user.id);
    }
    return {success:true,message:'If that email has an account, a reset link is on its way.'};
  }

  async resetPassword(token:string,newPassword:string){
    const record=await this.resets.findOneBy({tokenHash:this.hashToken(token),usedAt:IsNull()});
    if(!record||record.expiresAt.getTime()<Date.now())throw new UnauthorizedException('That reset link is invalid or has expired. Request a new one.');
    const user=await this.users.findOneBy({id:record.userId});
    if(!user||!user.isActive)throw new UnauthorizedException('That reset link is invalid or has expired. Request a new one.');
    user.passwordHash=await hash(newPassword,12);
    user.mustChangePassword=false;
    // Bumping the version signs out every existing session: if the account was
    // taken over, the reset must evict whoever is already inside.
    user.tokenVersion+=1;
    await this.users.save(user);
    record.usedAt=new Date();
    await this.resets.save(record);
    await this.audit(user.email,'password_reset_completed','user',user.id);
    await this.mail.trySend({to:user.email,subject:'Your Vikipat password was changed',
      text:`Hello ${user.name},\n\nYour studio account password has just been changed and all other sessions were signed out.\n\nIf this was not you, contact your administrator immediately.`});
    return {success:true};
  }

  async audit(actorEmail:string,action:string,entity:string,entityId='',details:unknown={}){await this.audits.save(this.audits.create({actorEmail,action,entity,entityId,details:JSON.stringify(details)}))}
}
