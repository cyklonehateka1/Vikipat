import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { isRole, permissionsForRole } from '@vikipat/domain';
import { User } from './entities';

export type AuthUser={id:string;email:string;name:string;role:string;permissions:readonly string[];csrf:string;tokenVersion:number;mustChangePassword:boolean};
declare module 'express-serve-static-core' { interface Request { user?:AuthUser } }

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwt:JwtService,@InjectRepository(User) private users:Repository<User>){}
  async canActivate(context:ExecutionContext){
    const request=context.switchToHttp().getRequest<Request>();
    const token=request.cookies?.admin_session;
    if(!token)throw new UnauthorizedException('Authentication required');
    try{
      const payload=await this.jwt.verifyAsync<AuthUser>(token,{issuer:'vikipat-api',audience:'vikipat-admin'});
      const user=await this.users.findOneBy({id:payload.id});
      if(!user||user.tokenVersion!==payload.tokenVersion||!user.isActive||!isRole(user.role))throw new UnauthorizedException('Session is no longer valid');
      request.user={...payload,email:user.email,name:user.name,role:user.role,permissions:permissionsForRole(user.role),mustChangePassword:user.mustChangePassword};
      return true;
    }catch(error){
      if(error instanceof UnauthorizedException)throw error;
      throw new UnauthorizedException('Session expired');
    }
  }
}
@Injectable()
export class PasswordChangedGuard implements CanActivate {
  canActivate(context:ExecutionContext){
    const user=context.switchToHttp().getRequest<Request>().user;
    if(user?.mustChangePassword)throw new ForbiddenException('Password change required');
    return true;
  }
}
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context:ExecutionContext){
    const request=context.switchToHttp().getRequest<Request>();
    if(['GET','HEAD','OPTIONS'].includes(request.method))return true;
    const provided=request.headers['x-csrf-token'];
    if(!provided||provided!==request.user?.csrf)throw new ForbiddenException('Invalid CSRF token');
    return true;
  }
}

@Injectable()
export class AdminOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    if (context.switchToHttp().getRequest<Request>().user?.role !== 'admin') {
      throw new ForbiddenException('Administrator access required');
    }
    return true;
  }
}
@Injectable()
export class OperationsGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    if (!context.switchToHttp().getRequest<Request>().user?.permissions.includes('operations.read')) {
      throw new ForbiddenException('Operations access required');
    }
    return true;
  }
}
