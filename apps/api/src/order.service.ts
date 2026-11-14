import { releaseProductionJobs } from './production-release';
import { computeRollConsumption } from './roll-consumption';
import { allowedProductionStages, permittedProductionStages } from './production-workflow';
import { assertVersion, dedupeCommand, lockedFindOne } from './db';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnApplicationBootstrap, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { createHmac, randomInt, randomUUID } from 'crypto';
import { Between, Repository } from 'typeorm';
import { CreateGuestOrderDto, CreateOnlineOrderDto, LargeFormatEstimateDto, OrderLineItemDto, UpdateProductionJobDto } from './dto';
import { AttendanceRecord, AuditLog, Estimate, MaterialConsumption, MaterialItem, NotificationOutbox, Order, OrderItem, OrderRefund, OrderStatus, OrderStatusHistory, OrderTrackingOtp, PaymentTransaction, Product, ProductionJob, ProductionJobActivity, ProductionStage, ServicePriceRule, StockActivity } from './entities';
import { NotificationService } from './notification.service';
import { PaymentService } from './payment.service';
import { CustomerService } from './customer.service';
import { hasPermission, priceBookForSource, type OrderSource, type PriceBookCode } from '@vikipat/domain';
import { calculateLargeFormat } from '@vikipat/pricing-engine';
import { matchesFixedSize, parseFixedSizes } from './material-sizes';
import { dateOnly } from './finance';

const RATE_SEED=[
  ['sav-sticker','SAV / Sticker',210,220,240],['flexy-banner','Flexy / Banner',230,240,260],['oneway-vision','Oneway Vision',590,605,630],
  ['transparent-sav','Transparent SAV',380,390,410],['reflective-sav','Reflective SAV',600,615,650],['blueback','Blueback',380,390,410],
  ['ash-back-pvc','Ash Back / PVC',700,715,730],['white-back','White Back',220,235,260],['flag','Flag',540,550,580],
  ['cutting-sav','Cutting (SAV)',410,420,440],['cutting-tsav','Cutting (TSAV)',580,590,610],['cutting-only','Cutting Only',150,160,180],['photopaper','Photopaper',590,605,610],
] as const;
const PUBLIC_STATUS:Record<OrderStatus,string>={pending_review:'Under review',awaiting_payment:'Awaiting payment',paid:'Payment received',artwork_review:'Artwork review',awaiting_proof:'Awaiting your approval',ready_for_production:'Ready for production',in_production:'In production',quality_check:'Quality check',ready:'Ready for pickup',out_for_delivery:'Out for delivery',completed:'Completed',on_hold:'On hold',cancelled:'Cancelled'};

@Injectable()
export class OrderService implements OnApplicationBootstrap {
  constructor(@InjectRepository(ServicePriceRule) private rules:Repository<ServicePriceRule>,@InjectRepository(Estimate) private estimates:Repository<Estimate>,@InjectRepository(Order) private orders:Repository<Order>,@InjectRepository(OrderItem) private items:Repository<OrderItem>,@InjectRepository(Product) private products:Repository<Product>,@InjectRepository(ProductionJob) private jobs:Repository<ProductionJob>,@InjectRepository(ProductionJobActivity) private jobActivity:Repository<ProductionJobActivity>,@InjectRepository(OrderStatusHistory) private history:Repository<OrderStatusHistory>,@InjectRepository(OrderTrackingOtp) private otps:Repository<OrderTrackingOtp>,@InjectRepository(NotificationOutbox) private outbox:Repository<NotificationOutbox>,private jwt:JwtService,private notifications:NotificationService,private payments:PaymentService,private customers:CustomerService,@InjectRepository(OrderRefund) private refunds:Repository<OrderRefund>,@InjectRepository(AttendanceRecord) private attendance:Repository<AttendanceRecord>){}
  onApplicationBootstrap(){return this.seed()}
  async seed(){for(const [code,name,employee,marketer,walkIn] of RATE_SEED){if(!await this.rules.findOneBy({code}))await this.rules.save(this.rules.create({code,name,material:name,employeeRatePesewas:employee,marketerRatePesewas:marketer,walkInRatePesewas:walkIn,onlineRatePesewas:walkIn}))}}
  listRules(){return this.rules.find({where:{active:true},order:{name:'ASC'}})}
  async estimate(dto:LargeFormatEstimateDto,context:{priceBook:PriceBookCode;allowConfirmedDesignFee:boolean}={priceBook:'online',allowConfirmedDesignFee:false}){
    const rule=await this.rules.findOneBy({code:dto.serviceCode,active:true}); if(!rule)throw new NotFoundException('Service is unavailable');
    // Materials sold in set sizes only accept one of their listed sizes.
    if(rule.allowCustomSize===false){const sizes=parseFixedSizes(rule.fixedSizes);if(!matchesFixedSize(sizes,dto.width,dto.height,dto.unit))throw new BadRequestException(`${rule.name} only comes in these sizes: ${sizes.map(s=>`${s.label} (${s.width} × ${s.height} ${s.unit})`).join(', ')}.`);}
    const quote=calculateLargeFormat({
      serviceCode:rule.code,
      serviceName:rule.name,
      version:rule.version,
      ratesPesewasPerSqFt:{online:rule.onlineRatePesewas,walk_in:rule.walkInRatePesewas,marketer:rule.marketerRatePesewas,employee:rule.employeeRatePesewas},
      designMinimumPesewas:rule.designMinimumPesewas,
      roundingMode:rule.roundingMode,
      roundingStage:'line',
    },{
      width:dto.width,height:dto.height,unit:dto.unit,quantity:dto.quantity,priceBook:context.priceBook,needsDesign:Boolean(dto.needsDesign),
      confirmedDesignFeePesewas:context.allowConfirmedDesignFee?dto.designFeePesewas:undefined,
    });
    return {...quote,name:quote.serviceName,areaSqFt:quote.areaPerPieceSqFt,ratePesewas:quote.ratePesewasPerSqFt,roundingPolicy:quote.roundingMode,designMessage:quote.requiresReview?'Design starts from GH₵100. Final fee is confirmed after review.':null};
  }
  async createPublicEstimate(dto:LargeFormatEstimateDto){
    const quote=await this.estimate(dto,{priceBook:'online',allowConfirmedDesignFee:false});
    // A real checkout involves filling contact details, choosing delivery,
    // and uploading artwork — 30 minutes was tripping genuine customers with
    // "Estimate has expired" at submission. Pricing is always recomputed from
    // the live rate table at order time regardless of this window (see
    // assertEstimateMatches below); this TTL only guards against a rate
    // change happening mid-session, so a few hours is still safe.
    const expiresAt=new Date(Date.now()+4*60*60*1000);
    const record=await this.estimates.save(this.estimates.create({
      publicId:`EST-${randomUUID().replaceAll('-','').slice(0,12).toUpperCase()}`,calculator:quote.calculator,disposition:quote.disposition,
      serviceCode:quote.serviceCode,ruleVersion:quote.ruleVersion,priceBook:quote.priceBook,subtotalPesewas:quote.basePesewas,
      designFeePesewas:quote.designFeePesewas,totalPesewas:quote.totalPesewas,currency:'GHS',fingerprint:quote.fingerprint,
      inputSnapshot:JSON.stringify({serviceCode:dto.serviceCode,width:dto.width,height:dto.height,unit:dto.unit,quantity:dto.quantity,needsDesign:Boolean(dto.needsDesign)}),
      calculationSnapshot:JSON.stringify(quote),expiresAt,
    }));
    return {...quote,estimateId:record.publicId,expiresAt};
  }
  async estimateStaff(dto:CreateGuestOrderDto){
    const priceBook=priceBookForSource(dto.source==='salesperson'?'salesperson':'walk_in');
    const lines=[];let requiresReview=false;
    for(const line of dto.items){
      if(line.type==='large_format'){const quote=await this.estimate({...line,serviceCode:line.serviceCode!,width:line.width!,height:line.height!,unit:line.unit!},{priceBook,allowConfirmedDesignFee:true});lines.push({name:quote.name,totalPesewas:quote.totalPesewas});requiresReview ||= quote.requiresReview;}
      else if(line.type==='product'){const product=await this.products.findOneBy({id:line.productId!,status:'Active'});if(!product)throw new BadRequestException('Product is unavailable');if(product.stock<line.quantity)throw new BadRequestException(`Only ${product.stock} of ${product.name} in stock`);lines.push({name:product.name,totalPesewas:Math.round(product.price*100)*line.quantity});}
      else {requiresReview ||= !line.unitPricePesewas;lines.push({name:line.name,totalPesewas:(line.unitPricePesewas||0)*line.quantity});}
    }
    return {lines,requiresReview,totalPesewas:lines.reduce((sum,l)=>sum+l.totalPesewas,0)+(dto.deliveryFeePesewas||0)};
  }
  async createGuest(dto:CreateGuestOrderDto,source:OrderSource='online'){
    if(source==='online'&&(dto as Partial<CreateOnlineOrderDto>).paymentMethod!=='mobile_money')throw new BadRequestException('Select Mobile Money: paymentMethod must be exactly mobile_money');
    dto.customerEmail=(dto.customerEmail||'').trim().toLowerCase();
    if(source==='online'&&!dto.customerEmail)throw new BadRequestException('Email is required for online orders');
    if(!dto.customerEmail&&!dto.customerPhone)throw new BadRequestException('Provide a customer email or phone number');
    if(source==='online'&&(dto.items.some(l=>l.type==='custom')||dto.deliveryFeePesewas||dto.salesperson))throw new BadRequestException('Staff-only order fields are not accepted online');
    if(source==='salesperson'&&!dto.salesperson?.trim())throw new BadRequestException('Enter the salesperson responsible for this order');
    if(dto.fulfilmentMethod&&!['pickup','delivery'].includes(dto.fulfilmentMethod))throw new BadRequestException('Choose pickup or delivery');
    if(dto.fulfilmentMethod==='delivery'&&!dto.deliveryAddress?.trim())throw new BadRequestException('A delivery address is required');
    if(dto.artworkOption==='link'&&!/^https?:\/\//.test(dto.artworkLink||''))throw new BadRequestException('Enter a valid artwork link');
    // Uploaded artwork always comes from this app's own /uploads/ endpoint (see
    // AdminService.createQuote for the same rule) — never an arbitrary external host.
    if(dto.artworkUrl)this.assertArtworkUrl(dto.artworkUrl);
    for(const line of dto.items)if(line.artworkUrl)this.assertArtworkUrl(line.artworkUrl);
    if(dto.requestedDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(dto.requestedDate)||!Number.isFinite(Date.parse(dto.requestedDate))||new Date(dto.requestedDate).toISOString().slice(0,10)!==dto.requestedDate))throw new BadRequestException('Enter a valid required date');
    if(dto.website)return{success:true};
    const priceBook=priceBookForSource(source); const allowConfirmedDesignFee=source!=='online';
    const orderNumber=await this.uniqueNumber();
    const order=await this.orders.manager.transaction(async manager=>{
      if(dto.requestKey){if(manager.connection.options.type==='postgres')await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))',[dto.requestKey]);const existing=await manager.getRepository(Order).findOneBy({requestKey:dto.requestKey});if(existing)return existing;}
      const products=manager.getRepository(Product); const orders=manager.getRepository(Order);
      const items=manager.getRepository(OrderItem); const stocks=manager.getRepository(StockActivity); const history=manager.getRepository(OrderStatusHistory);
      let subtotalPesewas=0,designFeePesewas=0,requiresReview=false;
      const lines:Partial<OrderItem>[]=[];
      for(const line of dto.items as OrderLineItemDto[]){
        if(line.type==='product'){
          const product=await lockedFindOne(manager,Product,{id:line.productId!,status:'Active'});
          if(!product)throw new BadRequestException('One of the products in your order is no longer available');
          if(product.stock<line.quantity)throw new BadRequestException(`Only ${product.stock} of "${product.name}" left in stock`);
          const unitPricePesewas=Math.round(product.price*100); const totalPesewas=unitPricePesewas*line.quantity;
          const previousStock=product.stock; product.stock-=line.quantity; await products.save(product);
          await stocks.save(stocks.create({productId:product.id,productName:product.name,previousStock,newStock:product.stock,reason:'Order placed',actorEmail:`order:${source}`}));
          subtotalPesewas+=totalPesewas;
          lines.push({kind:'product',productId:product.id,serviceCode:'',name:product.name,quantity:line.quantity,unitPricePesewas,totalPesewas,specification:JSON.stringify({unit:product.unit})});
        }else if(line.type==='custom'){
          if(!line.unitPricePesewas)requiresReview=true;
          const total=(line.unitPricePesewas||0)*line.quantity;subtotalPesewas+=total;
          lines.push({kind:'custom',productId:'',serviceCode:'custom',name:line.name!,quantity:line.quantity,unitPricePesewas:line.unitPricePesewas||0,totalPesewas:total,specification:JSON.stringify({description:line.description||'',artworkUrl:line.artworkUrl||'',artworkName:line.artworkName||'',manualQuote:true})});
        }else{
          const quote=await this.estimate({serviceCode:line.serviceCode!,width:line.width!,height:line.height!,unit:line.unit!,quantity:line.quantity,needsDesign:line.needsDesign,estimateId:line.estimateId,fingerprint:line.fingerprint,designFeePesewas:line.designFeePesewas},{priceBook,allowConfirmedDesignFee});
          await this.assertEstimateMatches(line,quote);
          if(quote.requiresReview)requiresReview=true;
          subtotalPesewas+=quote.basePesewas; designFeePesewas+=quote.designFeePesewas;
          lines.push({kind:'large_format',productId:'',serviceCode:quote.serviceCode,name:quote.name,quantity:quote.quantity,unitPricePesewas:Math.round(quote.basePesewas/quote.quantity),totalPesewas:quote.totalPesewas,specification:JSON.stringify({estimateId:line.estimateId||'',width:quote.width,height:quote.height,unit:quote.unit,areaSqFt:quote.areaSqFt,totalAreaSqFt:quote.totalAreaSqFt,ratePesewas:quote.ratePesewas,priceBook:quote.priceBook,ruleVersion:quote.ruleVersion,fingerprint:quote.fingerprint,needsDesign:Boolean(line.needsDesign),roundingPolicy:quote.roundingPolicy,artworkOption:dto.artworkOption||'',artworkUrl:line.artworkUrl||dto.artworkUrl||'',artworkName:line.artworkName||dto.artworkName||'',artworkLink:dto.artworkLink||'',fulfilmentMethod:dto.fulfilmentMethod||'',deliveryAddress:dto.deliveryAddress||'',deliveryLandmark:dto.deliveryLandmark||''})});
        }
      }
      const totalPesewas=subtotalPesewas+designFeePesewas+(dto.deliveryFeePesewas||0);
      if(!Number.isSafeInteger(totalPesewas)||totalPesewas>100000000)throw new BadRequestException('Order total exceeds the supported limit');
      // Roll this order up under the customer's email so repeat buyers form
      // one profile for reporting, whether they came through the storefront
      // or the counter. Inside the transaction: no orphan profiles.
      const customerId=await this.customers.linkOrder(manager,{email:dto.customerEmail,name:dto.customerName,phone:dto.customerPhone,totalPesewas:subtotalPesewas+designFeePesewas});
      const savedOrder=await orders.save(orders.create({orderNumber,source,customerId,requestKey:dto.requestKey||null,salesperson:dto.salesperson||'',deliveryFeePesewas:dto.deliveryFeePesewas||0,customerName:dto.customerName.trim(),customerEmail:dto.customerEmail.trim().toLowerCase(),customerPhone:dto.customerPhone||'',status:requiresReview?'pending_review':'awaiting_payment',paymentStatus:requiresReview?'unpaid':'pending',subtotalPesewas,designFeePesewas,totalPesewas,requiresReview,promisedDate:dto.requestedDate||'',customerNote:this.checkoutNote(dto)}));
      await items.save(lines.map(line=>items.create({...line,orderId:savedOrder.id})));
      await history.save(history.create({orderId:savedOrder.id,status:savedOrder.status,actor:source,customerVisible:true,note:(requiresReview?'We are reviewing the design requirement and final price.':'Your order is ready for payment.')+(source==='online'?' Customer selected Mobile Money.':'')}));
      return savedOrder;
    });
    const payment=source==='online'?await this.payments.initializePaystack(order):null;
    if(payment){order.paymentProvider='paystack';order.paymentReference=payment.reference;await this.orders.save(order)}
    const receipt={subject:`Vikipat order ${orderNumber} received`,text:`Hello ${order.customerName}, your order number is ${orderNumber}. Current status: ${PUBLIC_STATUS[order.status]}.`};
    await this.notifications.queueEmail(order,'order_created',receipt);
    await this.notifications.queueWhatsApp(order,'order_created',receipt);
    return{id:order.id,orderNumber:order.orderNumber,status:PUBLIC_STATUS[order.status],paymentStatus:order.paymentStatus,totalPesewas:order.totalPesewas,requiresReview:order.requiresReview,payment:payment?{provider:'paystack',reference:payment.reference,authorizationUrl:payment.authorizationUrl,accessCode:payment.accessCode,providerConfigured:payment.providerConfigured}:null};
  }
  async requestOtp(orderNumber:string,email:string){
    const normalized=email.trim().toLowerCase(); const order=await this.orders.findOneBy({orderNumber,customerEmail:normalized});
    let devOtp:string|undefined;
    if(order){
      // An attacker who exhausts the 5-attempt lockout on an active OTP must not be able to
      // reset it by simply requesting a new one — carry the exhausted state (attempts + the
      // original expiry) forward onto the reissued OTP until it naturally expires.
      const existing=await this.otps.findOne({where:{orderId:order.id,consumed:false},order:{createdAt:'DESC'}});
      const lockedOut=Boolean(existing&&existing.expiresAt.getTime()>=Date.now()&&existing.attempts>=5);
      await this.otps.update({orderId:order.id,consumed:false},{consumed:true});
      const code=String(randomInt(0,1000000)).padStart(6,'0');
      const otp=this.otps.create({orderId:order.id,emailHash:this.hmac(normalized),codeHash:this.hmac(`${order.id}:${code}`),expiresAt:lockedOut?existing!.expiresAt:new Date(Date.now()+10*60*1000),attempts:lockedOut?existing!.attempts:0});
      await this.otps.save(otp);
      await this.notifications.queueEmail(order,'tracking_otp',{subject:`Your Vikipat tracking code`,text:`Your verification code is ${code}. It expires in 10 minutes. Never share this code.`});
      if(process.env.NODE_ENV!=='production'&&process.env.ALLOW_DEV_OTP==='true')devOtp=code;
    }
    else this.hmac(`${orderNumber}:${normalized}:dummy`);
    return{message:'If the order number and email match, a verification code has been sent.',expiresInSeconds:600,...(devOtp?{devOtp}: {})};
  }
  async verifyOtp(orderNumber:string,email:string,code:string){
    const order=await this.orders.findOneBy({orderNumber,customerEmail:email.trim().toLowerCase()}); if(!order)throw new UnauthorizedException('Invalid or expired verification code');
    const otp=await this.otps.findOne({where:{orderId:order.id,consumed:false},order:{createdAt:'DESC'}}); if(!otp||otp.expiresAt.getTime()<Date.now()||otp.attempts>=5)throw new UnauthorizedException('Invalid or expired verification code');
    otp.attempts+=1; if(otp.codeHash!==this.hmac(`${order.id}:${code}`)){await this.otps.save(otp);throw new UnauthorizedException('Invalid or expired verification code')}
    otp.consumed=true;await this.otps.save(otp);const token=await this.jwt.signAsync({orderId:order.id,emailHash:this.hmac(order.customerEmail)},{audience:'vikipat-order-tracking',expiresIn:'20m'});return{token,order:await this.safeOrder(order)};
  }
  async tracked(token:string|undefined){if(!token)throw new UnauthorizedException('Verification required');try{const p=await this.jwt.verifyAsync<{orderId:string,emailHash:string}>(token,{issuer:'vikipat-api',audience:'vikipat-order-tracking'});const order=await this.orders.findOneBy({id:p.orderId});if(!order||this.hmac(order.customerEmail)!==p.emailHash)throw new UnauthorizedException();return this.safeOrder(order)}catch{throw new UnauthorizedException('Tracking session expired')}}
  async list(){return this.orders.find({order:{createdAt:'DESC'},take:250})}
  async listProductionJobs(role:string){const jobs=await this.jobs.find({order:{createdAt:'DESC'},take:500});return jobs.map(job=>({...job,allowedStages:permittedProductionStages(job.stage,role)}))}
  async listProductionIntake(){
    const orders=await this.orders.createQueryBuilder('order')
      .where("order.status NOT IN (:...statuses)",{statuses:['completed','cancelled']})
      .andWhere("(order.paymentStatus = :paid OR order.source IN (:...sources))",{paid:'paid',sources:['walk_in','salesperson']})
      .andWhere('NOT EXISTS (SELECT 1 FROM production_jobs job WHERE job."orderId" = CAST(order.id AS text))')
      .orderBy('order.createdAt','DESC').take(250).getMany();
    return orders.map(({id,orderNumber,customerName,source,paymentStatus,status,totalPesewas,version})=>({id,orderNumber,customerName,source,paymentStatus,status,totalPesewas,version}));
  }
  /** Orders created on one calendar day, by channel — for the owner's daily digest. */
  async ordersCreatedOn(date:string){
    date=this.validDate(date);
    const orders=await this.orders.find({where:{createdAt:Between(new Date(`${date}T00:00:00.000Z`),new Date(`${date}T23:59:59.999Z`))}});
    const bySource={online:0,walk_in:0,salesperson:0} as Record<OrderSource,number>;
    for(const o of orders)bySource[o.source]=(bySource[o.source]||0)+1;
    return{count:orders.length,bySource};
  }
  /** Every custom/manual-quote line item — the only place a human types in a price — for owner review. */
  async flagCustomPricedItems(from?:string,to?:string){
    const items=await this.items.find({where:{kind:'custom'}});
    if(!items.length)return[];
    const orders=await this.orders.find();
    const orderMap=new Map(orders.map(o=>[o.id,o]));
    const fromDate=from?new Date(`${this.validDate(from)}T00:00:00.000Z`):null,toDate=to?new Date(`${this.validDate(to)}T23:59:59.999Z`):null;
    return items.map(item=>({item,order:orderMap.get(item.orderId)}))
      .filter((x):x is{item:typeof items[number];order:Order}=>!!x.order)
      .filter(({order})=>(!fromDate||order.createdAt>=fromDate)&&(!toDate||order.createdAt<=toDate))
      .map(({item,order})=>({orderId:item.orderId,orderNumber:order.orderNumber,customerName:order.customerName,name:item.name,quantity:item.quantity,unitPricePesewas:item.unitPricePesewas,totalPesewas:item.totalPesewas,createdAt:order.createdAt}));
  }
  /** Orders cancelled or refunded after they had already reached production — an ordinary cancellation almost never happens this late. */
  async flagLateCancellations(from?:string,to?:string){
    const REACHED_PRODUCTION:OrderStatus[]=['ready_for_production','in_production','quality_check','ready','out_for_delivery','completed'];
    const [cancelled,refunds,allOrders]=await Promise.all([this.orders.find({where:{status:'cancelled'}}),this.refunds.find(),this.orders.find()]);
    const refundedOrderIds=new Set(refunds.map(r=>r.orderId));
    const candidates=new Map<string,Order>();
    for(const o of cancelled)candidates.set(o.id,o);
    for(const o of allOrders)if(refundedOrderIds.has(o.id))candidates.set(o.id,o);
    const fromDate=from?new Date(`${this.validDate(from)}T00:00:00.000Z`):null,toDate=to?new Date(`${this.validDate(to)}T23:59:59.999Z`):null;
    const results=[];
    for(const order of candidates.values()){
      const history=await this.history.find({where:{orderId:order.id}});
      const triggerTimes:Date[]=[];
      if(order.status==='cancelled'){const row=history.find(h=>h.status==='cancelled');if(row)triggerTimes.push(row.createdAt)}
      for(const r of refunds)if(r.orderId===order.id)triggerTimes.push(r.occurredAt);
      if(!triggerTimes.length)continue;
      const triggerAt=triggerTimes.sort((a,b)=>a.getTime()-b.getTime())[0];
      if(fromDate&&triggerAt<fromDate)continue;
      if(toDate&&triggerAt>toDate)continue;
      const reached=history.filter(h=>REACHED_PRODUCTION.includes(h.status)&&h.createdAt<triggerAt).sort((a,b)=>b.createdAt.getTime()-a.createdAt.getTime())[0];
      if(!reached)continue;
      results.push({orderId:order.id,orderNumber:order.orderNumber,customerName:order.customerName,cancelledOrRefundedAt:triggerAt,reachedStage:reached.status,reachedAt:reached.createdAt});
    }
    return results;
  }
  /** Production work logged with nobody clocked in to have done it — a report, never a block. */
  async flagUnattendedJobs(date:string){
    date=this.validDate(date);
    const start=new Date(`${date}T00:00:00.000Z`),end=new Date(`${date}T23:59:59.999Z`);
    const activity=(await this.jobActivity.find({where:{type:'stage_change'}})).filter(a=>a.createdAt>=start&&a.createdAt<=end);
    if(!activity.length)return[];
    const attendance=await this.attendance.find();
    const covered=(at:Date)=>attendance.some(r=>r.clockIn<=at&&(!r.clockOut||r.clockOut>=at));
    const uncovered=activity.filter(a=>!covered(a.createdAt));
    if(!uncovered.length)return[];
    const jobs=await this.jobs.find();
    const jobMap=new Map(jobs.map(j=>[j.id,j]));
    return uncovered.map(a=>({jobId:a.jobId,jobNumber:a.jobNumber,orderNumber:jobMap.get(a.jobId)?.orderNumber||'',occurredAt:a.createdAt,note:a.note}));
  }
  async listProductionJobActivity(jobId:string){
    const job=await this.jobs.findOneBy({id:jobId});if(!job)throw new NotFoundException('Production job not found');
    return this.jobActivity.find({where:{jobId},order:{createdAt:'DESC'},take:100});
  }
  async addProductionJobNote(jobId:string,note:string,actor:string){
    const job=await this.jobs.findOneBy({id:jobId});if(!job)throw new NotFoundException('Production job not found');
    return this.jobActivity.save(this.jobActivity.create({jobId:job.id,orderId:job.orderId,jobNumber:job.jobNumber,type:'note',note:note.trim(),actor}));
  }
  /**
   * The money itself is moved by an admin outside this system (Paystack
   * dashboard, MoMo reversal, cash back over the counter). This records that
   * it happened, so the order, the customer's lifetime value and the finance
   * reports all agree with reality.
   *
   * Partial refunds are supported and cumulative; the total can never exceed
   * what the customer actually paid.
   */
  async updateStatus(id:string,status:OrderStatus,note:string,customerVisible:boolean,actor:string){const order=await this.orders.findOneBy({id});if(!order)throw new NotFoundException('Order not found');if(status==='paid'&&order.paymentStatus!=='paid')throw new BadRequestException('Record a payment before marking an order paid');if(order.status==='cancelled'&&status!=='cancelled')throw new BadRequestException('Cancelled orders cannot be reopened here');order.status=status;await this.orders.save(order);await this.history.save(this.history.create({orderId:id,status,note,actor,customerVisible}));if(customerVisible){const payload={subject:`Vikipat order ${order.orderNumber}: ${PUBLIC_STATUS[status]}`,text:`Hello ${order.customerName}, your order ${order.orderNumber} is now ${PUBLIC_STATUS[status]}.${note?` ${note}`:''}`};await this.notifications.queueEmail(order,'order_status',payload);await this.notifications.queueWhatsApp(order,'order_status',payload)}return order}
  async updateProductionJob(id:string,dto:UpdateProductionJobDto,actor:string,role:string){
    const result=await this.jobs.manager.transaction(async manager=>{
      const run=async()=>{
      const jobs=manager.getRepository(ProductionJob);
      const job=await lockedFindOne(manager,ProductionJob,{id});
      if(!job)throw new NotFoundException('Production job not found');
      assertVersion(job.version,dto.expectedVersion);
      const previousStage=job.stage;
      if(!allowedProductionStages(previousStage).includes(dto.stage))throw new BadRequestException(`Cannot move production job from ${previousStage} to ${dto.stage}. Refresh the job and choose an allowed stage.`);
      if(!permittedProductionStages(previousStage,role).includes(dto.stage))throw new ForbiddenException('Your role cannot make this stage change');
      if(((dto.assignedTo!==undefined&&dto.assignedTo!==job.assignedTo)||(dto.dueDate!==undefined&&dto.dueDate!==job.dueDate))&&!hasPermission(role,'jobs.assign'))throw new ForbiddenException('Job assignment permission required');
      if(dto.internalNote!==undefined&&dto.internalNote!==job.internalNote&&!hasPermission(role,'jobs.note'))throw new ForbiddenException('Job note permission required');
      const stageChanged=previousStage!==dto.stage;
      job.stage=dto.stage;
      job.assignedTo=dto.assignedTo??job.assignedTo;
      job.dueDate=dto.dueDate??job.dueDate;
      job.internalNote=dto.internalNote??job.internalNote;
      job.version+=1;
      await jobs.save(job);
      let rollConsumptionGapNote='';
      if(stageChanged&&dto.stage==='in_production'){
        const alreadyConsumed=await manager.getRepository(MaterialConsumption).existsBy({jobId:job.id});
        if(!alreadyConsumed){
          const consumed=await computeRollConsumption(manager,job,actor);
          if(!consumed){
            // A roll exists for this service but none fit/had stock — flag the gap
            // rather than letting it surface later as an unexplained physical-count shortfall.
            const hasRollMaterial=await manager.getRepository(MaterialItem).existsBy({kind:'roll',serviceCode:job.serviceCode});
            if(hasRollMaterial)rollConsumptionGapNote='No roll material had a fitting width in stock — log material use manually.';
          }
        }
      }
      await manager.getRepository(ProductionJobActivity).save({
        jobId:job.id,orderId:job.orderId,jobNumber:job.jobNumber,
        type:stageChanged?'stage_change':'assignment',fromStage:previousStage,toStage:job.stage,
        note:[dto.internalNote,rollConsumptionGapNote].filter(Boolean).join(' — ')||'',actor,
      });
      const status=stageChanged?this.orderStatusForStage(job.stage):null;
      if(!status)return {job,notification:null};
      const orders=manager.getRepository(Order);
      const order=await lockedFindOne(manager,Order,{id:job.orderId});
      if(!order)throw new NotFoundException('Order not found');
      if(order.status===status)return {job,notification:null};
      order.status=status;
      await orders.save(order);
      // Customer messages use only public status text, never staff notes or assignments.
      const note=`Your order is now ${PUBLIC_STATUS[status]}.`;
      await manager.getRepository(OrderStatusHistory).save({orderId:order.id,status,note,actor,customerVisible:true});
      return {job,notification:{order,payload:{subject:`Vikipat order ${order.orderNumber}: ${PUBLIC_STATUS[status]}`,text:`Hello ${order.customerName}, ${note}`}}};
      };
      return dto.commandId?dedupeCommand(manager,dto.commandId,dto.deviceId||'',actor,run):run();
    });
    if(result.notification){
      const {order,payload}=result.notification;
      await this.notifications.queueEmail(order,'order_status',payload);
      await this.notifications.queueWhatsApp(order,'order_status',payload);
    }
    return result.job;
  }

  async releaseOrderToProduction(orderId:string,actor='system',override?:{reason:string},sync?:{commandId?:string,deviceId?:string,expectedVersion?:number}){
    const result=await this.orders.manager.transaction(async manager=>{
      const run=async()=>{
        const order=await lockedFindOne(manager,Order,{id:orderId});
        if(!order)throw new NotFoundException('Order not found');
        assertVersion(order.version,sync?.expectedVersion);
        const released=await releaseProductionJobs(manager,orderId,actor,override);
        // Re-fetch: releaseProductionJobs saved its own copy, so `order` is stale.
        const orders=manager.getRepository(Order);
        const updated=await orders.findOne({where:{id:orderId}});
        if(!updated)throw new NotFoundException('Order not found');
        updated.version+=1;
        await orders.save(updated);
        return {jobs:released.jobs,notificationIds:released.notificationIds,version:updated.version};
      };
      return sync?.commandId?dedupeCommand(manager,sync.commandId,sync.deviceId||'',actor,run):run();
    });
    // Existing outbox records are committed with the jobs; retries do not queue them again.
    await this.notifications.deliverQueued(result.notificationIds);
    return {jobs:result.jobs,version:result.version};
  }
  private async safeOrder(order:Order){const items=await this.items.findBy({orderId:order.id});const history=await this.history.find({where:{orderId:order.id,customerVisible:true},order:{createdAt:'ASC'}});return{orderNumber:order.orderNumber,customerName:order.customerName,status:PUBLIC_STATUS[order.status],paymentStatus:order.paymentStatus,totalPesewas:order.totalPesewas,promisedDate:order.promisedDate,createdAt:order.createdAt,updatedAt:order.updatedAt,items:items.map(i=>({name:i.name,quantity:i.quantity,totalPesewas:i.totalPesewas,specification:JSON.parse(i.specification)})),timeline:history.map(h=>({status:PUBLIC_STATUS[h.status],note:h.note,createdAt:h.createdAt}))}}
  private assertArtworkUrl(url:string){const origin=process.env.API_PUBLIC_URL||'http://localhost:3000';if(!url.startsWith(origin+'/uploads/'))throw new BadRequestException('Invalid artwork URL')}
  private hmac(value:string){return createHmac('sha256',process.env.TRACKING_OTP_SECRET||process.env.JWT_SECRET||'development-only').update(value).digest('hex')}
  /**
   * Per-sq-ft rates change rarely, so this is a lightweight "did the rate
   * actually change" check, not a time-based expiry. The fingerprint is
   * deterministic from the job spec plus the currently-published rule
   * version, so it only ever mismatches when an admin republishes pricing
   * between the customer viewing a quote and checking out — a real, rare
   * event worth catching. There is no estimateId lookup or TTL here: the
   * order's price is always the fresh number computed just above in
   * createGuest, this only decides whether to warn the customer it moved.
   */
  private assertEstimateMatches(input:{fingerprint?:string},quote:Awaited<ReturnType<OrderService['estimate']>>){
    if(input.fingerprint&&input.fingerprint!==quote.fingerprint)throw new BadRequestException('Estimate has changed. Please refresh the quote and try again.');
  }
  // Same try/catch-to-BadRequestException shape already used by AnalyticsService/PeopleService for dateOnly().
  private validDate(value:string){try{return dateOnly(value)}catch{throw new BadRequestException('Enter a valid calendar date')}}
  private checkoutNote(dto:CreateGuestOrderDto){
    return [
      dto.customerNote?.trim()||'',
      dto.fulfilmentMethod?`Fulfilment: ${dto.fulfilmentMethod}`:'',
      dto.deliveryAddress?`Delivery address: ${dto.deliveryAddress}`:'',
      dto.deliveryLandmark?`Delivery landmark: ${dto.deliveryLandmark}`:'',
      dto.requestedDate?`Requested date: ${dto.requestedDate}`:'',
      dto.artworkOption?`Artwork option: ${dto.artworkOption}`:'',
      dto.artworkUrl?`Artwork upload: ${dto.artworkUrl}${dto.artworkName?` (${dto.artworkName})`:''}`:'',
      dto.artworkLink?`Artwork link: ${dto.artworkLink}`:'',
    ].filter(Boolean).join('\n');
  }
  private orderStatusForStage(stage:ProductionStage):OrderStatus|null{
    const map:Partial<Record<ProductionStage,OrderStatus>>={artwork_review:'artwork_review',proofing:'awaiting_proof',production_ready:'ready_for_production',in_production:'in_production',quality_check:'quality_check',ready:'ready',fulfilled:'completed',blocked:'on_hold',cancelled:'cancelled'};
    return map[stage]||null;
  }
  private async uniqueNumber(){for(let i=0;i<10;i++){const value=`VP-${randomUUID().replaceAll('-','').slice(0,8).toUpperCase()}`;if(!await this.orders.existsBy({orderNumber:value}))return value}throw new BadRequestException('Could not create order number')}
}
