import { OnApplicationBootstrap } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AdjustStockDto, CreateProductDto, CreateQuoteDto, UpdateProductDto, UpdateSettingsDto } from './dto';
import { AuditLog, Product, QuoteRequest, StockActivity, StoreSettings } from './entities';
import { AuthService } from './auth.service';
export declare class AdminService implements OnApplicationBootstrap {
    private products;
    private stocks;
    private settings;
    private audits;
    private quotes;
    private auth;
    constructor(products: Repository<Product>, stocks: Repository<StockActivity>, settings: Repository<StoreSettings>, audits: Repository<AuditLog>, quotes: Repository<QuoteRequest>, auth: AuthService);
    onApplicationBootstrap(): Promise<void>;
    list(q?: string): Promise<Product[]>;
    publicCatalog(): Promise<{
        products: {
            id: string;
            name: string;
            category: string;
            price: number;
            unit: string;
            description: string;
            image: string;
            stock: number;
            featured: boolean;
            createdAt: Date;
            updatedAt: Date;
        }[];
        settings: {
            businessName: string;
            phone: string;
            location: string;
            currency: string;
            description: string;
            updatedAt: Date;
        };
    }>;
    publicProduct(id: string): Promise<{
        id: string;
        name: string;
        category: string;
        price: number;
        unit: string;
        description: string;
        image: string;
        stock: number;
        featured: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    one(id: string): Promise<Product>;
    create(dto: CreateProductDto, email: string): Promise<Product>;
    update(id: string, dto: UpdateProductDto, email: string): Promise<Product>;
    remove(id: string, email: string): Promise<{
        success: boolean;
    }>;
    adjust(id: string, dto: AdjustStockDto, email: string): Promise<Product>;
    private recordStock;
    stockActivity(): Promise<StockActivity[]>;
    summary(): Promise<{
        totalProducts: number;
        activeProducts: number;
        lowStock: number;
        categories: number;
        totalStock: number;
        catalogueHealth: number;
        newQuotes: number;
    }>;
    insights(): Promise<{
        summary: {
            totalProducts: number;
            activeProducts: number;
            lowStock: number;
            categories: number;
            totalStock: number;
            catalogueHealth: number;
            newQuotes: number;
        };
        categoryMix: {
            name: "Labels" | "Packaging" | "DTF" | "Large Format" | "Corporate Branding" | "Souvenirs" | "Events";
            count: number;
        }[];
        weeklyViews: number[];
        weeklyActivity: number[];
        generatedAt: string;
    }>;
    activity(): Promise<{
        details: any;
        id: string;
        action: string;
        entity: string;
        entityId: string;
        actorEmail: string;
        createdAt: Date;
    }[]>;
    getSettings(): Promise<StoreSettings>;
    updateSettings(dto: UpdateSettingsDto, email: string): Promise<StoreSettings>;
    createQuote(dto: CreateQuoteDto): Promise<{
        success: boolean;
        id?: undefined;
    } | {
        success: boolean;
        id: string;
    }>;
    listQuotes(): Promise<QuoteRequest[]>;
    updateQuoteStatus(id: string, status: QuoteRequest['status'], email: string): Promise<QuoteRequest>;
}
