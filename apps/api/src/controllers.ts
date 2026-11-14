import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import { AdminService } from './admin.service';
import { AuthService } from './auth.service';
import { MaterialService } from './material.service';
import { PricingAdminService } from './pricing-admin.service';
import { StorageService } from './storage.service';
import { AdjustMaterialStockDto, AdjustStockDto, ChangePasswordDto, CreateMaterialItemDto, CreateProductDto, CreateQuoteDto, LoginDto, RecordPhysicalCountDto, RequestPasswordResetDto, ResetPasswordDto, UpdateMaterialItemDto, UpdateProductDto, UpdateQuoteStatusDto, UpdateSettingsDto } from './dto';
import { AdminOnlyGuard, AuthGuard, CsrfGuard, OperationsGuard, PasswordChangedGuard } from './security';
const cookieSecure=process.env.COOKIE_SECURE==='true';
const cookieOptions={httpOnly:true,sameSite:(cookieSecure?'none':'strict') as 'none'|'strict',secure:cookieSecure,maxAge:8*60*60*1000,path:'/'};
// Files are held in memory only long enough to forward them to R2; nothing
// is written to the container's disk, which does not survive a redeploy.
const imageUpload={storage:memoryStorage(),limits:{fileSize:5*1024*1024,files:1}};
const artworkUpload={storage:memoryStorage(),limits:{fileSize:10*1024*1024,files:1}};

@Controller('auth') export class AuthController {
  constructor(private auth:AuthService){}
  @Post('login') @Throttle({default:{limit:5,ttl:60000}}) async login(@Body() dto:LoginDto,@Res({passthrough:true}) response:Response){const result=await this.auth.login(dto.email,dto.password);response.cookie('admin_session',result.token,cookieOptions);return{csrfToken:result.csrf,user:result.user}}
  @Get('me') @UseGuards(AuthGuard) me(@Req() request:Request){const user=request.user!;return{csrfToken:user.csrf,user:{email:user.email,role:user.role,mustChangePassword:user.mustChangePassword,name:user.name,permissions:user.permissions}}}
  @Post('logout') @UseGuards(AuthGuard,CsrfGuard) logout(@Res({passthrough:true}) response:Response){response.clearCookie('admin_session',{...cookieOptions,maxAge:0});return{success:true}}
  @Post('forgot-password') @Throttle({default:{limit:5,ttl:15*60000}}) forgotPassword(@Body() dto:RequestPasswordResetDto,@Req() request:Request){return this.auth.requestPasswordReset(dto.email,request.ip||'')}
  @Post('reset-password') @Throttle({default:{limit:5,ttl:15*60000}}) resetPassword(@Body() dto:ResetPasswordDto){return this.auth.resetPassword(dto.token,dto.newPassword)}
  @Post('change-password') @UseGuards(AuthGuard,CsrfGuard) async changePassword(@Req() request:Request,@Body() dto:ChangePasswordDto,@Res({passthrough:true}) response:Response){const result=await this.auth.changePassword(request.user!.id,request.user!.email,dto.currentPassword,dto.newPassword);response.clearCookie('admin_session',{...cookieOptions,maxAge:0});return result}
}

@Controller('admin') @UseGuards(AuthGuard,PasswordChangedGuard,CsrfGuard) export class AdminController {
  constructor(private admin:AdminService,private storage:StorageService,private materials:MaterialService){}
  // Read-only: also used by staff picking shop-product line items for a counter order.
  @Get('products') products(@Req() req:Request,@Query('q') q?:string){if(req.user!.role!=='admin'&&!req.user!.permissions.includes('orders.manage'))throw new ForbiddenException('Order management permission required');return this.admin.list(q)}
  @Get('products/:id') product(@Req() req:Request,@Param('id') id:string){if(req.user!.role!=='admin'&&!req.user!.permissions.includes('orders.manage'))throw new ForbiddenException('Order management permission required');return this.admin.one(id)}
  @Post('products') @UseGuards(AdminOnlyGuard) create(@Req() req:Request,@Body() dto:CreateProductDto){return this.admin.create(dto,req.user!.email)}
  @Patch('products/:id') @UseGuards(AdminOnlyGuard) update(@Req() req:Request,@Param('id') id:string,@Body() dto:UpdateProductDto){return this.admin.update(id,dto,req.user!.email)}
  @Delete('products/:id') @UseGuards(AdminOnlyGuard) remove(@Req() req:Request,@Param('id') id:string){return this.admin.remove(id,req.user!.email)}
  @Post('products/:id/stock') @UseGuards(AdminOnlyGuard) adjust(@Req() req:Request,@Param('id') id:string,@Body() dto:AdjustStockDto){return this.admin.adjust(id,dto,req.user!.email)}
  @Post('products/:id/count') @UseGuards(AdminOnlyGuard) recordProductCount(@Req() req:Request,@Param('id',ParseUUIDPipe) id:string,@Body() dto:RecordPhysicalCountDto){return this.materials.recordPhysicalCount('product',id,dto.measuredQuantity,req.user!.email,dto.note)}
  @Get('stock-activity') @UseGuards(AdminOnlyGuard) stock(){return this.admin.stockActivity()}
  @Get('dashboard') @UseGuards(AdminOnlyGuard) dashboard(){return this.admin.summary()}
  @Get('insights') @UseGuards(AdminOnlyGuard) insights(){return this.admin.insights()}
  @Get('activity') @UseGuards(AdminOnlyGuard) activity(@Query('entity') entity?:string,@Query('entityId') entityId?:string){return this.admin.activity({entity,entityId})}
  @Get('settings') @UseGuards(AdminOnlyGuard) settings(){return this.admin.getSettings()}
  @Patch('settings') @UseGuards(AdminOnlyGuard) updateSettings(@Req() req:Request,@Body() dto:UpdateSettingsDto){return this.admin.updateSettings(dto,req.user!.email)}
  @Get('quotes') @UseGuards(AdminOnlyGuard) quotes(){return this.admin.listQuotes()}
  @Patch('quotes/:id/status') @UseGuards(AdminOnlyGuard) updateQuote(@Req() req:Request,@Param('id') id:string,@Body() dto:UpdateQuoteStatusDto){return this.admin.updateQuoteStatus(id,dto.status,req.user!.email)}
  @Post('media') @UseGuards(AdminOnlyGuard) @UseInterceptors(FileInterceptor('file',imageUpload)) upload(@UploadedFile() file:Express.Multer.File){if(!file)throw new BadRequestException('A valid JPG, PNG or WebP image is required');return this.storage.upload(file,{prefix:'catalogue',kind:'image'})}
}

// list/one are read by any operations staff (the job panel's material picker needs them);
// create/update/adjust stay admin-only, same split as AdminOrderController's own routes.
@Controller('admin/materials') @UseGuards(AuthGuard,PasswordChangedGuard,CsrfGuard,OperationsGuard) export class MaterialController {
  constructor(private materials:MaterialService){}
  @Get() list(){return this.materials.list()}
  @Get('reconciliation') @UseGuards(AdminOnlyGuard) reconciliation(@Query('from') from:string,@Query('to') to:string){return this.materials.reconciliation(from,to)}
  @Get('flags/shortfalls') @UseGuards(AdminOnlyGuard) shortfalls(@Query('from') from:string,@Query('to') to:string){return this.materials.flagShortfalls(from,to)}
  @Get(':id') one(@Param('id') id:string){return this.materials.one(id)}
  @Post() @UseGuards(AdminOnlyGuard) create(@Req() req:Request,@Body() dto:CreateMaterialItemDto){return this.materials.create(dto,req.user!.email)}
  @Patch(':id') @UseGuards(AdminOnlyGuard) update(@Req() req:Request,@Param('id') id:string,@Body() dto:UpdateMaterialItemDto){return this.materials.update(id,dto,req.user!.email)}
  @Post(':id/stock') @UseGuards(AdminOnlyGuard) adjust(@Req() req:Request,@Param('id') id:string,@Body() dto:AdjustMaterialStockDto){return this.materials.adjust(id,dto,req.user!.email)}
  @Post(':id/count') @UseGuards(AdminOnlyGuard) recordCount(@Req() req:Request,@Param('id',ParseUUIDPipe) id:string,@Body() dto:RecordPhysicalCountDto){return this.materials.recordPhysicalCount('material_item',id,dto.measuredQuantity,req.user!.email,dto.note)}
}

@Controller('quotes') export class QuoteController {
  constructor(private admin:AdminService,private storage:StorageService){}
  @Post() @Throttle({default:{limit:8,ttl:60000}}) create(@Body() dto:CreateQuoteDto){return this.admin.createQuote(dto)}
  @Post('media') @Throttle({default:{limit:5,ttl:60000}}) @UseInterceptors(FileInterceptor('file',artworkUpload)) upload(@UploadedFile() file:Express.Multer.File){if(!file)throw new BadRequestException('A valid artwork file is required');return this.storage.upload(file,{prefix:'artwork',kind:'artwork'})}
}

@Controller('health') export class HealthController {
  @Get() check(){return{status:'ok',timestamp:new Date().toISOString()}}
}

@Controller('catalog') export class CatalogController {
  constructor(private admin:AdminService,private pricing:PricingAdminService){}
  @Get() catalog(){return this.admin.publicCatalog()}
  @Get('products/:id') product(@Param('id') id:string){return this.admin.publicProduct(id)}
  @Get('print-materials') printMaterials(){return this.pricing.publicMaterials()}
}
