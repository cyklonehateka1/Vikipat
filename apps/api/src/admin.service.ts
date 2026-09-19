import { BadRequestException, Injectable, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { AdjustStockDto, CreateProductDto, CreateQuoteDto, UpdateProductDto, UpdateSettingsDto } from './dto';
import { AuditLog, Product, QuoteRequest, StockActivity, StoreSettings } from './entities';
import { AuthService } from './auth.service';
import { CATEGORIES, SEED_PRODUCTS } from './catalog.seed';
@Injectable() export class AdminService implements OnApplicationBootstrap {
  constructor(@InjectRepository(Product) private products:Repository<Product>,@InjectRepository(StockActivity) private stocks:Repository<StockActivity>,@InjectRepository(StoreSettings) private settings:Repository<StoreSettings>,@InjectRepository(AuditLog) private audits:Repository<AuditLog>,@InjectRepository(QuoteRequest) private quotes:Repository<QuoteRequest>,private auth:AuthService){}
  async onApplicationBootstrap(){for(const seed of SEED_PRODUCTS){const existing=await this.products.findOneBy({name:seed.name});if(existing){Object.assign(existing,{category:seed.category});await this.products.save(existing)}else await this.products.save(this.products.create(seed))}if(await this.settings.count()===0)await this.settings.save(this.settings.create())}
  list(q?:string){return this.products.find({where:q?{name:Like(`%${q}%`)}:{},order:{createdAt:'DESC'}})}
  async publicCatalog(){
    const products=await this.products.find({where:{status:'Active'},order:{featured:'DESC',createdAt:'DESC'}});
    const settings=await this.getSettings();
    return {products:products.map(({status,...product})=>product),settings:{businessName:settings.businessName,phone:settings.phone,location:settings.location,currency:settings.currency,description:settings.description,updatedAt:settings.updatedAt}};
  }
  async publicProduct(id:string){
    const product=await this.products.findOneBy({id,status:'Active'});
    if(!product)throw new NotFoundException('Product not found');
    const {status,...result}=product;
    return result;
  }
  async one(id:string){const product=await this.products.findOneBy({id});if(!product)throw new NotFoundException('Product not found');return product}
  async create(dto:CreateProductDto,email:string){const product=await this.products.save(this.products.create({...dto,image:dto.image||'',status:dto.status||'Active',featured:dto.featured||false}));await this.auth.audit(email,'create','product',product.id,{name:product.name});return product}
  async update(id:string,dto:UpdateProductDto,email:string){const product=await this.one(id);const previousStock=product.stock;Object.assign(product,dto);const saved=await this.products.save(product);if(dto.stock!==undefined&&dto.stock!==previousStock)await this.recordStock(saved,previousStock,dto.stock,'Product update',email);await this.auth.audit(email,'update','product',id,dto);return saved}
  async remove(id:string,email:string){const product=await this.one(id);await this.products.remove(product);await this.auth.audit(email,'delete','product',id,{name:product.name});return{success:true}}
  async adjust(id:string,dto:AdjustStockDto,email:string){const product=await this.one(id);const previous=product.stock;product.stock=dto.stock;await this.products.save(product);await this.recordStock(product,previous,dto.stock,dto.reason,email);await this.auth.audit(email,'adjust_stock','product',id,dto);return product}
  private recordStock(product:Product,previousStock:number,newStock:number,reason:string,actorEmail:string){return this.stocks.save(this.stocks.create({productId:product.id,productName:product.name,previousStock,newStock,reason,actorEmail}))}
  stockActivity(){return this.stocks.find({order:{createdAt:'DESC'},take:100})}
  async summary(){const all=await this.products.find();return{totalProducts:all.length,activeProducts:all.filter(p=>p.status==='Active').length,lowStock:all.filter(p=>p.stock<10).length,categories:new Set(all.map(p=>p.category)).size,totalStock:all.reduce((sum,p)=>sum+p.stock,0),catalogueHealth:all.length?Math.round(all.filter(p=>p.status==='Active'&&p.image&&p.description).length/all.length*100):0,newQuotes:await this.quotes.countBy({status:'New'})}}
  async insights(){const all=await this.products.find();const audit=await this.audits.find({order:{createdAt:'ASC'}});const days=Array.from({length:7},(_,index)=>{const date=new Date();date.setHours(0,0,0,0);date.setDate(date.getDate()-(6-index));return date});const weeklyActivity=days.map((day,index)=>{const end=index===6?new Date():days[index+1];return audit.filter(item=>item.createdAt>=day&&item.createdAt<end).length});const max=Math.max(...weeklyActivity,1);return{summary:await this.summary(),categoryMix:CATEGORIES.map(name=>({name,count:all.filter(p=>p.category===name).length})),weeklyViews:weeklyActivity.map(value=>Math.round(value/max*100)),weeklyActivity,generatedAt:new Date().toISOString()}}
  async activity(){const audit=await this.audits.find({order:{createdAt:'DESC'},take:20});return audit.map(item=>({...item,details:JSON.parse(item.details)}))}
  async getSettings(){return (await this.settings.find({take:1}))[0]}
  async updateSettings(dto:UpdateSettingsDto,email:string){const settings=await this.getSettings();Object.assign(settings,dto);const saved=await this.settings.save(settings);await this.auth.audit(email,'update','settings',saved.id,dto);return saved}
  async createQuote(dto:CreateQuoteDto){const {website,...data}=dto;if(website)return{success:true};if(data.artworkUrl){const origin=process.env.API_PUBLIC_URL||'http://localhost:3000';if(!data.artworkUrl.startsWith(origin+'/uploads/'))throw new BadRequestException('Invalid artwork URL')}const quote=await this.quotes.save(this.quotes.create({...data,status:'New'}));await this.auth.audit('storefront','create','quote',quote.id,{name:quote.name,need:quote.need});return{success:true,id:quote.id}}
  listQuotes(){return this.quotes.find({order:{createdAt:'DESC'},take:250})}
  async updateQuoteStatus(id:string,status:QuoteRequest['status'],email:string){const quote=await this.quotes.findOneBy({id});if(!quote)throw new NotFoundException('Quote request not found');quote.status=status;const saved=await this.quotes.save(quote);await this.auth.audit(email,'update_status','quote',id,{status});return saved}
}
