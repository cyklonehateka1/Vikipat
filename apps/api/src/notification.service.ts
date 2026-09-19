import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import nodemailer from 'nodemailer';
import { Repository } from 'typeorm';
import { NotificationOutbox, Order, StoreSettings } from './entities';

@Injectable()
export class NotificationService {
  private readonly logger=new Logger(NotificationService.name);
  constructor(@InjectRepository(NotificationOutbox) private outbox:Repository<NotificationOutbox>,@InjectRepository(StoreSettings) private settings:Repository<StoreSettings>){}

  async queueEmail(order:Order,template:string,payload:Record<string,unknown>){
    const record=await this.outbox.save(this.outbox.create({orderId:order.id,channel:'email',recipient:order.customerEmail,template,payload:JSON.stringify(payload)}));
    await this.deliver(record);
  }
  async queueWhatsApp(order:Order,template:string,payload:Record<string,unknown>){
    if(!order.customerPhone)return;
    const config=(await this.settings.find({take:1}))[0];
    if(!config?.whatsappNotificationsEnabled)return;
    const record=await this.outbox.save(this.outbox.create({orderId:order.id,channel:'whatsapp',recipient:order.customerPhone,template,payload:JSON.stringify(payload)}));
    await this.deliver(record);
  }
  async deliverQueued(ids:string[]){
    for(const id of ids){
      const record=await this.outbox.findOneBy({id,status:'pending'});
      if(record)await this.deliver(record);
    }
  }
  private async deliver(record:NotificationOutbox){
    try{
      record.attempts+=1;
      if(record.channel==='email')await this.sendEmail(record);
      else await this.sendWhatsApp(record);
      record.status='sent'; record.lastError='';
    }catch(error){
      record.status='failed'; record.lastError=error instanceof Error?error.message.slice(0,500):'Delivery failed';
      this.logger.warn(`${record.channel} notification ${record.id} failed: ${record.lastError}`);
    }
    await this.outbox.save(record);
  }
  private async sendEmail(record:NotificationOutbox){
    const host=process.env.SMTP_HOST;
    if(!host)throw new Error('SMTP is not configured');
    const payload=JSON.parse(record.payload) as {subject?:string;text?:string};
    const transport=nodemailer.createTransport({host,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='true',auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined});
    await transport.sendMail({from:process.env.EMAIL_FROM||'Vikipat <orders@vikipat.com>',to:record.recipient,subject:payload.subject||'Your Vikipat order',text:payload.text||''});
  }
  private async sendWhatsApp(record:NotificationOutbox){
    if(!process.env.WHATSAPP_API_URL||!process.env.WHATSAPP_ACCESS_TOKEN)throw new Error('WhatsApp API is not configured');
    const response=await fetch(process.env.WHATSAPP_API_URL,{method:'POST',headers:{Authorization:`Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({to:record.recipient,template:record.template,parameters:JSON.parse(record.payload)})});
    if(!response.ok)throw new Error(`WhatsApp provider returned ${response.status}`);
  }
}
