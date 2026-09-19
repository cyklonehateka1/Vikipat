import { Request, Response } from 'express';
import { AdminService } from './admin.service';
import { AuthService } from './auth.service';
import { AdjustStockDto, ChangePasswordDto, CreateProductDto, CreateQuoteDto, LoginDto, UpdateProductDto, UpdateQuoteStatusDto, UpdateSettingsDto } from './dto';
export declare class AuthController {
    private auth;
    constructor(auth: AuthService);
    login(dto: LoginDto, response: Response): Promise<{
        csrfToken: string;
        user: {
            email: string;
            name: string;
            role: import("@vikipat/domain").Role;
            permissions: readonly ("operations.read" | "jobs.release" | "jobs.assign" | "jobs.note" | "jobs.artwork" | "jobs.production" | "jobs.qc" | "jobs.dispatch" | "jobs.supervise")[];
            mustChangePassword: boolean;
        };
    }>;
    me(request: Request): {
        csrfToken: string;
        user: {
            email: string;
            role: string;
            mustChangePassword: boolean;
            name: string;
            permissions: readonly string[];
        };
    };
    logout(response: Response): {
        success: boolean;
    };
    changePassword(request: Request, dto: ChangePasswordDto, response: Response): Promise<{
        success: boolean;
    }>;
}
export declare class AdminController {
    private admin;
    constructor(admin: AdminService);
    products(q?: string): Promise<import("./entities").Product[]>;
    product(id: string): Promise<import("./entities").Product>;
    create(req: Request, dto: CreateProductDto): Promise<import("./entities").Product>;
    update(req: Request, id: string, dto: UpdateProductDto): Promise<import("./entities").Product>;
    remove(req: Request, id: string): Promise<{
        success: boolean;
    }>;
    adjust(req: Request, id: string, dto: AdjustStockDto): Promise<import("./entities").Product>;
    stock(): Promise<import("./entities").StockActivity[]>;
    dashboard(): Promise<{
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
    settings(): Promise<import("./entities").StoreSettings>;
    updateSettings(req: Request, dto: UpdateSettingsDto): Promise<import("./entities").StoreSettings>;
    quotes(): Promise<import("./entities").QuoteRequest[]>;
    updateQuote(req: Request, id: string, dto: UpdateQuoteStatusDto): Promise<import("./entities").QuoteRequest>;
    upload(file: Express.Multer.File): {
        url: string;
    };
}
export declare class QuoteController {
    private admin;
    constructor(admin: AdminService);
    create(dto: CreateQuoteDto): Promise<{
        success: boolean;
        id?: undefined;
    } | {
        success: boolean;
        id: string;
    }>;
    upload(file: Express.Multer.File): {
        url: string;
        name: string;
    };
}
export declare class CatalogController {
    private admin;
    constructor(admin: AdminService);
    catalog(): Promise<{
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
    product(id: string): Promise<{
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
}
