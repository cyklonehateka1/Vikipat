import { ForbiddenException, Body, Controller, Get, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AddProductionJobNoteDto, CreateGuestOrderDto, CreateOnlineOrderDto, LargeFormatEstimateDto, RequestTrackingOtpDto, UpdateOrderStatusDto, UpdateProductionJobDto, VerifyTrackingOtpDto } from './dto';
import { CommerceService, RecordRefundDto } from './commerce.service';
import { OrderService } from './order.service';
import { AdminOnlyGuard, OperationsGuard, AuthGuard, CsrfGuard, PasswordChangedGuard } from './security';

const trackingCookieSecure=process.env.COOKIE_SECURE==='true';
const trackingCookie={httpOnly:true,sameSite:(trackingCookieSecure?'none':'strict') as 'none'|'strict',secure:trackingCookieSecure,maxAge:20*60*1000,path:'/api/order-tracking'};

@Controller()
export class CustomerOrderController {
  constructor(private orders:OrderService){}
  @Get('services/large-format') services(){return this.orders.listRules()}
  @Post('estimates/large-format') @Throttle({default:{limit:30,ttl:60000}}) estimate(@Body() dto:LargeFormatEstimateDto){return this.orders.createPublicEstimate(dto)}
  @Post('orders') @Throttle({default:{limit:10,ttl:60000}}) create(@Body() dto:CreateOnlineOrderDto){return this.orders.createGuest(dto,'online')}
  @Post('order-tracking/request-otp') @Throttle({default:{limit:5,ttl:15*60000}}) requestOtp(@Body() dto:RequestTrackingOtpDto){return this.orders.requestOtp(dto.orderNumber,dto.email)}
  @Post('order-tracking/verify-otp') @Throttle({default:{limit:10,ttl:15*60000}}) async verifyOtp(@Body() dto:VerifyTrackingOtpDto,@Res({passthrough:true}) response:Response){const result=await this.orders.verifyOtp(dto.orderNumber,dto.email,dto.code);response.cookie('order_tracking',result.token,trackingCookie);return{order:result.order}}
  @Get('order-tracking/order') tracked(@Req() request:Request){return this.orders.tracked(request.cookies?.order_tracking)}
  @Post('order-tracking/logout') logout(@Res({passthrough:true}) response:Response){response.clearCookie('order_tracking',{...trackingCookie,maxAge:0});return{success:true}}
}

@Controller('admin/orders')
@UseGuards(AuthGuard,PasswordChangedGuard,CsrfGuard,OperationsGuard)
export class AdminOrderController {
  constructor(private orders:OrderService,private commerce:CommerceService){}
  @Get() @UseGuards(AdminOnlyGuard) list(){return this.orders.list()}
  @Get('production/intake') intake(@Req() request:Request){if(!request.user!.permissions.includes('jobs.release'))throw new ForbiddenException('Job release permission required');return this.orders.listProductionIntake()}
  @Get('production/jobs') jobs(@Req() request:Request){return this.orders.listProductionJobs(request.user!.role)}
  @Post('estimate') @UseGuards(AdminOnlyGuard) estimate(@Body() dto:CreateGuestOrderDto){return this.orders.estimateStaff(dto)}
  @Post() @UseGuards(AdminOnlyGuard) create(@Body() dto:CreateGuestOrderDto){return this.orders.createGuest(dto,dto.source==='salesperson'?'salesperson':'walk_in')}
  @Post(':id/release') release(@Req() request:Request,@Param('id') id:string){if(!request.user!.permissions.includes('jobs.release'))throw new ForbiddenException('Job release permission required');return this.orders.releaseOrderToProduction(id,request.user!.email)}
  @Post(':id/refund') @UseGuards(AdminOnlyGuard) refund(@Req() request:Request,@Param('id') id:string,@Body() dto:RecordRefundDto){return this.commerce.refund(id,dto,request.user!.email)}
  @Patch(':id/status') @UseGuards(AdminOnlyGuard) update(@Req() request:Request,@Param('id') id:string,@Body() dto:UpdateOrderStatusDto){return this.orders.updateStatus(id,dto.status,dto.note||'',dto.customerVisible!==false,request.user!.email)}
  @Get('production/jobs/:id/activity') jobActivity(@Param('id') id:string){return this.orders.listProductionJobActivity(id)}
  @Post('production/jobs/:id/activity') addJobNote(@Req() request:Request,@Param('id') id:string,@Body() dto:AddProductionJobNoteDto){if(!request.user!.permissions.includes('jobs.note'))throw new ForbiddenException('Job note permission required');return this.orders.addProductionJobNote(id,dto.note,request.user!.email)}
  @Patch('production/jobs/:id') updateJob(@Req() request:Request,@Param('id') id:string,@Body() dto:UpdateProductionJobDto){return this.orders.updateProductionJob(id,dto,request.user!.email,request.user!.role)}
}
