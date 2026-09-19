import { Request, Response } from 'express';
import { AddProductionJobNoteDto, CreateGuestOrderDto, LargeFormatEstimateDto, RequestTrackingOtpDto, UpdateOrderStatusDto, UpdateProductionJobDto, VerifyTrackingOtpDto } from './dto';
import { OrderService } from './order.service';
export declare class CustomerOrderController {
    private orders;
    constructor(orders: OrderService);
    services(): Promise<import("./entities").ServicePriceRule[]>;
    estimate(dto: LargeFormatEstimateDto): Promise<{
        estimateId: string;
        expiresAt: Date;
        name: string;
        areaSqFt: number;
        ratePesewas: number;
        roundingPolicy: import("@vikipat/pricing-engine").RoundingMode;
        designMessage: string | null;
        calculator: "large_format_area";
        disposition: import("@vikipat/domain").EstimateDisposition;
        serviceCode: string;
        serviceName: string;
        ruleVersion: number;
        width: number;
        height: number;
        unit: import("@vikipat/domain").DimensionUnit;
        quantity: number;
        areaPerPieceSqFt: number;
        totalAreaSqFt: number;
        priceBook: import("@vikipat/domain").PriceBookCode;
        ratePesewasPerSqFt: number;
        basePesewas: number;
        designFeePesewas: number;
        totalPesewas: number;
        requiresReview: boolean;
        reviewReasons: string[];
        roundingMode: import("@vikipat/pricing-engine").RoundingMode;
        roundingStage: import("@vikipat/pricing-engine").RoundingStage;
        fingerprint: string;
    }>;
    create(dto: CreateGuestOrderDto): Promise<{
        success: boolean;
        orderNumber?: undefined;
        status?: undefined;
        paymentStatus?: undefined;
        totalPesewas?: undefined;
        requiresReview?: undefined;
        payment?: undefined;
    } | {
        orderNumber: string;
        status: string;
        paymentStatus: "paid" | "unpaid" | "pending" | "part_paid" | "refunded";
        totalPesewas: number;
        requiresReview: boolean;
        payment: {
            provider: string;
            reference: string;
            authorizationUrl: string;
            accessCode: string;
            providerConfigured: boolean;
        } | null;
        success?: undefined;
    }>;
    requestOtp(dto: RequestTrackingOtpDto): Promise<{
        devOtp?: string | undefined;
        message: string;
        expiresInSeconds: number;
    }>;
    verifyOtp(dto: VerifyTrackingOtpDto, response: Response): Promise<{
        order: {
            orderNumber: string;
            customerName: string;
            status: string;
            paymentStatus: "paid" | "unpaid" | "pending" | "part_paid" | "refunded";
            totalPesewas: number;
            promisedDate: string;
            createdAt: Date;
            updatedAt: Date;
            items: {
                name: string;
                quantity: number;
                totalPesewas: number;
                specification: any;
            }[];
            timeline: {
                status: string;
                note: string;
                createdAt: Date;
            }[];
        };
    }>;
    tracked(request: Request): Promise<{
        orderNumber: string;
        customerName: string;
        status: string;
        paymentStatus: "paid" | "unpaid" | "pending" | "part_paid" | "refunded";
        totalPesewas: number;
        promisedDate: string;
        createdAt: Date;
        updatedAt: Date;
        items: {
            name: string;
            quantity: number;
            totalPesewas: number;
            specification: any;
        }[];
        timeline: {
            status: string;
            note: string;
            createdAt: Date;
        }[];
    }>;
    logout(response: Response): {
        success: boolean;
    };
}
export declare class AdminOrderController {
    private orders;
    constructor(orders: OrderService);
    list(): Promise<import("./entities").Order[]>;
    intake(request: Request): Promise<{
        id: string;
        orderNumber: string;
        customerName: string;
        source: import("./entities").OrderSource;
        paymentStatus: "paid" | "unpaid" | "pending" | "part_paid" | "refunded";
        status: import("./entities").OrderStatus;
        totalPesewas: number;
    }[]>;
    jobs(request: Request): Promise<{
        allowedStages: import("./entities").ProductionStage[];
        id: string;
        orderId: string;
        orderItemId: string;
        orderNumber: string;
        jobNumber: string;
        customerName: string;
        serviceCode: string;
        title: string;
        quantity: number;
        stage: import("./entities").ProductionStage;
        priority: "low" | "normal" | "rush";
        assignedTo: string;
        dueDate: string;
        specification: string;
        internalNote: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    create(dto: CreateGuestOrderDto): Promise<{
        success: boolean;
        orderNumber?: undefined;
        status?: undefined;
        paymentStatus?: undefined;
        totalPesewas?: undefined;
        requiresReview?: undefined;
        payment?: undefined;
    } | {
        orderNumber: string;
        status: string;
        paymentStatus: "paid" | "unpaid" | "pending" | "part_paid" | "refunded";
        totalPesewas: number;
        requiresReview: boolean;
        payment: {
            provider: string;
            reference: string;
            authorizationUrl: string;
            accessCode: string;
            providerConfigured: boolean;
        } | null;
        success?: undefined;
    }>;
    release(request: Request, id: string): Promise<import("./entities").ProductionJob[]>;
    update(request: Request, id: string, dto: UpdateOrderStatusDto): Promise<import("./entities").Order>;
    jobActivity(id: string): Promise<import("./entities").ProductionJobActivity[]>;
    addJobNote(request: Request, id: string, dto: AddProductionJobNoteDto): Promise<import("./entities").ProductionJobActivity>;
    updateJob(request: Request, id: string, dto: UpdateProductionJobDto): Promise<import("./entities").ProductionJob>;
}
