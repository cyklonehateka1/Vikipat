import { BadRequestException, Body, Controller, Get, Injectable, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IsBoolean, IsEmail, IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { Request } from 'express';
import { AuditLog, BusinessPolicy, NotificationOutbox, Order, OrderItem, OrderRefund, OrderStatusHistory, PaymentTransaction, ProductionJob, ProductionJobActivity, QuoteRequest } from './entities';
import { lockedFindOne } from './db';
import { balances, collectedFor, paymentState } from './finance';
import { NotificationService } from './notification.service';
import { AdminOnlyGuard, AuthGuard, CsrfGuard, PasswordChangedGuard } from './security';

export const DEFAULT_POLICIES = {
  refundPolicy: 'Refunds are reviewed by an administrator. Before production, unused amounts may be refunded after accounting for agreed work already completed. Design or production already performed is reviewed individually. For defective or incorrect work, contact us with the order number and evidence so we can assess a correction, reprint or refund. Approved refunds are paid outside this app and recorded with a reference. No automatic refund deadlines or cancellation fees apply.',
  shiftMinutes: 480, workingDaysPerMonth: 26, overtimeMultiplier: 1.5, shiftStartHour: 8, lateGraceMinutes: 15,
  reportEmail: '', reportSchedule: 'off' as 'off'|'daily'|'weekly',
};
export class PolicyDto {
  @IsString() @Length(20,6000) refundPolicy!: string;
  @IsInt() @Min(60) @Max(1440) shiftMinutes!: number;
  @IsInt() @Min(1) @Max(31) workingDaysPerMonth!: number;
  @Min(1) @Max(5) overtimeMultiplier!: number;
  @IsInt() @Min(0) @Max(23) shiftStartHour!: number;
  @IsInt() @Min(0) @Max(120) lateGraceMinutes!: number;
  @IsString() @Length(0,254) reportEmail!: string;
  @IsIn(['off','daily','weekly']) reportSchedule!: 'off'|'daily'|'weekly';
}
export class RecordPaymentDto {
  @IsUUID() requestKey!: string;
  @IsInt() @Min(1) @Max(100000000) amountPesewas!: number;
  @IsIn(['cash','momo','bank_transfer']) method!: 'cash'|'momo'|'bank_transfer';
  @IsString() @Length(1,150) externalReference!: string;
  @IsISO8601({strict:true}) occurredAt!: string;
}
export class RecordRefundDto extends RecordPaymentDto {
  @IsIn(['cash','momo','bank_transfer','paystack']) declare method: any;
  @IsString() @Length(3,1000) reason!: string;
  @IsBoolean() cancelRemainingWork!: boolean;
  @IsBoolean() confirmedExternalPayment!: boolean;
}
export class EmailDto {
  @IsString() @Length(3,160) subject!: string;
  @IsString() @Length(3,6000) text!: string;
}
@Injectable()
export class CommerceService {
  constructor(private db:DataSource, private notifications:NotificationService) {}
  async policies() { const row=await this.db.getRepository(BusinessPolicy).findOneBy({id:'operations'}); return {...DEFAULT_POLICIES,...(row?JSON.parse(row.value):{})} as typeof DEFAULT_POLICIES; }
  async savePolicies(dto:PolicyDto, actor:string) {
    if(dto.reportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.reportEmail)) throw new BadRequestException('Enter a valid report email');
    if(dto.reportSchedule!=='off' && !dto.reportEmail) throw new BadRequestException('A report recipient is required');
    return this.db.transaction(async m=>{await m.getRepository(BusinessPolicy).save({id:'operations',value:JSON.stringify(dto)});await m.getRepository(AuditLog).save({actorEmail:actor,action:'policies_updated',entity:'business_policy',entityId:'operations',details:JSON.stringify(dto)});return dto;});
  }
  async detail(id:string) {
    const order=await this.db.getRepository(Order).findOneBy({id}); if(!order) throw new NotFoundException('Order not found');
    const [items,payments,refunds,history]=await Promise.all([this.db.getRepository(OrderItem).findBy({orderId:id}),this.db.getRepository(PaymentTransaction).findBy({orderId:id}),this.db.getRepository(OrderRefund).find({where:{orderId:id},order:{occurredAt:'ASC'}}),this.db.getRepository(OrderStatusHistory).find({where:{orderId:id},order:{createdAt:'ASC'}})]);
    return {...order,...balances(order,payments),items,payments,refunds,history};
  }
  private when(value:string) {const date=new Date(value);if(!Number.isFinite(date.getTime())||date.getTime()>Date.now()+60000)throw new BadRequestException('Payment date must be valid and cannot be in the future');return date;}
  async payment(id:string,dto:RecordPaymentDto,actor:string) {
    const occurredAt=this.when(dto.occurredAt);
    return this.db.transaction(async m=>{
      const order=await lockedFindOne(m,Order,{id});if(!order)throw new NotFoundException('Order not found');
      const reference=`MANUAL-${dto.requestKey}`;
      const existing=await m.getRepository(PaymentTransaction).findOneBy({reference});
      if(existing){if(existing.orderId!==id||existing.amountPesewas!==dto.amountPesewas||existing.provider!==dto.method||existing.externalReference!==dto.externalReference)throw new BadRequestException('This request key was used for a different payment');return existing;}
      if(order.requiresReview||order.status==='cancelled')throw new BadRequestException('Confirm pricing and an active order before recording payment');
      const payments=await m.getRepository(PaymentTransaction).findBy({orderId:id});
      const collected=collectedFor(order,payments);
      if(dto.amountPesewas>order.totalPesewas-collected)throw new BadRequestException('Payment exceeds the outstanding balance');
      const payment=await m.getRepository(PaymentTransaction).save({orderId:id,orderNumber:order.orderNumber,reference,amountPesewas:dto.amountPesewas,provider:dto.method,currency:'GHS',status:'paid',paidAt:occurredAt,recordedBy:actor,externalReference:dto.externalReference});
      order.paymentStatus=paymentState(order.totalPesewas,collected+dto.amountPesewas,order.refundedPesewas);
      if(order.paymentStatus==='paid'&&order.status==='awaiting_payment')order.status='paid';
      await m.getRepository(Order).save(order);
      await m.getRepository(AuditLog).save({actorEmail:actor,action:'payment_recorded',entity:'order',entityId:id,details:JSON.stringify(dto)});
      await m.getRepository(OrderStatusHistory).save({orderId:id,status:order.status,actor,customerVisible:true,note:`Payment of GHS ${(dto.amountPesewas/100).toFixed(2)} received via ${dto.method}.`});
      if(order.customerEmail)await m.getRepository(NotificationOutbox).save({orderId:id,channel:'email',recipient:order.customerEmail,template:'payment_received',payload:JSON.stringify({subject:`Receipt · ${order.orderNumber}`,text:`Hello ${order.customerName},\n\nWe received GHS ${(dto.amountPesewas/100).toFixed(2)} by ${dto.method}. Reference: ${dto.externalReference}.\nBalance: GHS ${((order.totalPesewas-collected-dto.amountPesewas)/100).toFixed(2)}.`})});
      return payment;
    });
  }
  async refund(id:string,dto:RecordRefundDto,actor:string) {
    if(!dto.confirmedExternalPayment)throw new BadRequestException('Confirm that the money was refunded outside the app');
    const occurredAt=this.when(dto.occurredAt), policy=await this.policies();
    return this.db.transaction(async m=>{
      const order=await lockedFindOne(m,Order,{id});if(!order)throw new NotFoundException('Order not found');
      const repo=m.getRepository(OrderRefund), existing=await repo.findOneBy({requestKey:dto.requestKey});
      if(existing){if(existing.orderId!==id||existing.amountPesewas!==dto.amountPesewas||existing.method!==dto.method||existing.reason!==dto.reason)throw new BadRequestException('This request key was used for a different refund');return existing;}
      const payments=await m.getRepository(PaymentTransaction).findBy({orderId:id});
      const collected=collectedFor(order,payments);
      if(dto.amountPesewas>collected-(order.refundedPesewas||0))throw new BadRequestException('Refund exceeds recorded payments remaining refundable');
      const refund=await repo.save(repo.create({orderId:id,...dto,recordedBy:actor,occurredAt,policySnapshot:policy.refundPolicy}));
      order.refundedPesewas=(order.refundedPesewas||0)+dto.amountPesewas;order.refundReason=dto.reason;order.refundedAt=occurredAt;order.refundedBy=actor;
      order.paymentStatus=paymentState(order.totalPesewas,collected,order.refundedPesewas);
      if(dto.cancelRemainingWork){
        if(order.status!=='completed')order.status='cancelled';
        const jobs=await m.getRepository(ProductionJob).findBy({orderId:id});
        for(const job of jobs.filter(j=>!['fulfilled','cancelled'].includes(j.stage))){await m.getRepository(ProductionJobActivity).save({jobId:job.id,orderId:id,jobNumber:job.jobNumber,type:'stage_change',fromStage:job.stage,toStage:'cancelled',actor,note:'Remaining work cancelled when external refund was recorded.'});job.stage='cancelled';await m.getRepository(ProductionJob).save(job);}
      }
      await m.getRepository(Order).save(order);
      await m.getRepository(AuditLog).save({actorEmail:actor,action:'external_refund_recorded',entity:'order',entityId:id,details:JSON.stringify(dto)});
      await m.getRepository(OrderStatusHistory).save({orderId:id,status:order.status,actor,customerVisible:true,note:`Refund of GHS ${(dto.amountPesewas/100).toFixed(2)} recorded. ${dto.reason}`});
      if(order.customerEmail)await m.getRepository(NotificationOutbox).save({orderId:id,channel:'email',recipient:order.customerEmail,template:'order_refunded',payload:JSON.stringify({subject:`Refund recorded · ${order.orderNumber}`,text:`Hello ${order.customerName},\n\nOur administrator recorded an external refund of GHS ${(dto.amountPesewas/100).toFixed(2)} via ${dto.method} on ${occurredAt.toISOString().slice(0,10)}. Reference: ${dto.externalReference}.\n\n${dto.reason}\n\nTotal refunded: GHS ${(order.refundedPesewas/100).toFixed(2)}.`})});
      return refund;
    });
  }
  async emailQuote(id:string,dto:EmailDto,actor:string) {
    const q=await this.db.getRepository(QuoteRequest).findOneBy({id});if(!q?.email)throw new BadRequestException('This quote has no email address');
    const record=await this.db.transaction(async m=>{const row=await m.getRepository(NotificationOutbox).save({orderId:'',channel:'email',recipient:q.email,template:'quote_reply',payload:JSON.stringify(dto)});q.status='Quoted';await m.getRepository(QuoteRequest).save(q);await m.getRepository(AuditLog).save({actorEmail:actor,action:'quote_email_queued',entity:'quote',entityId:id,details:JSON.stringify({notificationId:row.id})});return row;});
    return {queued:true,id:record.id};
  }
}
@Controller('admin/commerce')
@UseGuards(AuthGuard,PasswordChangedGuard,CsrfGuard,AdminOnlyGuard)
export class CommerceController {
  constructor(private commerce:CommerceService,private notifications:NotificationService){}
  @Get('policies') policies(){return this.commerce.policies();}
  @Patch('policies') save(@Body() dto:PolicyDto,@Req() r:Request){return this.commerce.savePolicies(dto,r.user!.email);}
  @Get('orders/:id') detail(@Param('id') id:string){return this.commerce.detail(id);}
  @Post('orders/:id/payments') payment(@Param('id') id:string,@Body() dto:RecordPaymentDto,@Req() r:Request){return this.commerce.payment(id,dto,r.user!.email);}
  @Post('orders/:id/refunds') refund(@Param('id') id:string,@Body() dto:RecordRefundDto,@Req() r:Request){return this.commerce.refund(id,dto,r.user!.email);}
  @Post('quotes/:id/email') email(@Param('id') id:string,@Body() dto:EmailDto,@Req() r:Request){return this.commerce.emailQuote(id,dto,r.user!.email);}
  @Get('notifications') messages(){return this.notifications.list();}
  @Post('notifications/:id/retry') retry(@Param('id') id:string){return this.notifications.retry(id);}
}
