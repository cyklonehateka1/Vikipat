import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { AdminService } from './admin.service';
import { AuthService } from './auth.service';
import { AdjustStockDto, ChangePasswordDto, CreateProductDto, CreateQuoteDto, LoginDto, UpdateProductDto, UpdateQuoteStatusDto, UpdateSettingsDto } from './dto';
import { AdminOnlyGuard, AuthGuard, CsrfGuard, PasswordChangedGuard } from './security';
const cookieOptions={httpOnly:true,sameSite:'strict' as const,secure:process.env.COOKIE_SECURE==='true',maxAge:8*60*60*1000,path:'/'};
const mediaExtensions:Record<string,string>={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','application/pdf':'.pdf'};
const mediaFilename=(_req:unknown,file:Express.Multer.File,callback:(error:Error|null,filename:string)=>void)=>callback(null,randomUUID()+mediaExtensions[file.mimetype]);

@Controller('auth') export class AuthController {
  constructor(private auth:AuthService){}
  @Post('login') @Throttle({default:{limit:5,ttl:60000}}) async login(@Body() dto:LoginDto,@Res({passthrough:true}) response:Response){const result=await this.auth.login(dto.email,dto.password);response.cookie('admin_session',result.token,cookieOptions);return{csrfToken:result.csrf,user:result.user}}
  @Get('me') @UseGuards(AuthGuard) me(@Req() request:Request){const user=request.user!;return{csrfToken:user.csrf,user:{email:user.email,role:user.role,mustChangePassword:user.mustChangePassword,name:user.name,permissions:user.permissions}}}
  @Post('logout') @UseGuards(AuthGuard,CsrfGuard) logout(@Res({passthrough:true}) response:Response){response.clearCookie('admin_session',{...cookieOptions,maxAge:0});return{success:true}}
  @Post('change-password') @UseGuards(AuthGuard,CsrfGuard) async changePassword(@Req() request:Request,@Body() dto:ChangePasswordDto,@Res({passthrough:true}) response:Response){const result=await this.auth.changePassword(request.user!.id,request.user!.email,dto.currentPassword,dto.newPassword);response.clearCookie('admin_session',{...cookieOptions,maxAge:0});return result}
}

@Controller('admin') @UseGuards(AuthGuard,PasswordChangedGuard,CsrfGuard,AdminOnlyGuard) export class AdminController {
  constructor(private admin:AdminService){}
  @Get('products') products(@Query('q') q?:string){return this.admin.list(q)}
  @Get('products/:id') product(@Param('id') id:string){return this.admin.one(id)}
  @Post('products') create(@Req() req:Request,@Body() dto:CreateProductDto){return this.admin.create(dto,req.user!.email)}
  @Patch('products/:id') update(@Req() req:Request,@Param('id') id:string,@Body() dto:UpdateProductDto){return this.admin.update(id,dto,req.user!.email)}
  @Delete('products/:id') remove(@Req() req:Request,@Param('id') id:string){return this.admin.remove(id,req.user!.email)}
  @Post('products/:id/stock') adjust(@Req() req:Request,@Param('id') id:string,@Body() dto:AdjustStockDto){return this.admin.adjust(id,dto,req.user!.email)}
  @Get('stock-activity') stock(){return this.admin.stockActivity()}
  @Get('dashboard') dashboard(){return this.admin.summary()}
  @Get('insights') insights(){return this.admin.insights()}
  @Get('activity') activity(){return this.admin.activity()}
  @Get('settings') settings(){return this.admin.getSettings()}
  @Patch('settings') updateSettings(@Req() req:Request,@Body() dto:UpdateSettingsDto){return this.admin.updateSettings(dto,req.user!.email)}
  @Get('quotes') quotes(){return this.admin.listQuotes()}
  @Patch('quotes/:id/status') updateQuote(@Req() req:Request,@Param('id') id:string,@Body() dto:UpdateQuoteStatusDto){return this.admin.updateQuoteStatus(id,dto.status,req.user!.email)}
  @Post('media') @UseInterceptors(FileInterceptor('file',{storage:diskStorage({destination:process.env.UPLOAD_DIRECTORY||'uploads',filename:mediaFilename}),limits:{fileSize:5*1024*1024,files:1},fileFilter:(_req,file,callback)=>callback(null,['image/jpeg','image/png','image/webp'].includes(file.mimetype))})) upload(@UploadedFile() file:Express.Multer.File){if(!file)throw new BadRequestException('A valid JPG, PNG or WebP image is required');return{url:`${process.env.API_PUBLIC_URL||'http://localhost:3000'}/uploads/${file.filename}`}}
}

@Controller('quotes') export class QuoteController {
  constructor(private admin:AdminService){}
  @Post() @Throttle({default:{limit:8,ttl:60000}}) create(@Body() dto:CreateQuoteDto){return this.admin.createQuote(dto)}
  @Post('media') @Throttle({default:{limit:5,ttl:60000}}) @UseInterceptors(FileInterceptor('file',{storage:diskStorage({destination:process.env.UPLOAD_DIRECTORY||'uploads',filename:mediaFilename}),limits:{fileSize:10*1024*1024,files:1},fileFilter:(_req,file,callback)=>{const allowed=['application/pdf','image/jpeg','image/png','image/webp'];if(!allowed.includes(file.mimetype))return callback(new BadRequestException('Artwork must be PDF, JPG, PNG or WebP'),false);callback(null,true)}})) upload(@UploadedFile() file:Express.Multer.File){if(!file)throw new BadRequestException('A valid artwork file is required');return{url:`${process.env.API_PUBLIC_URL||'http://localhost:3000'}/uploads/${file.filename}`,name:file.originalname}}
}

@Controller('health') export class HealthController {
  @Get() check(){return{status:'ok',timestamp:new Date().toISOString()}}
}

@Controller('catalog') export class CatalogController {
  constructor(private admin:AdminService){}
  @Get() catalog(){return this.admin.publicCatalog()}
  @Get('products/:id') product(@Param('id') id:string){return this.admin.publicProduct(id)}
}
