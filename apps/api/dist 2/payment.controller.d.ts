import { Request } from 'express';
import { PaymentService } from './payment.service';
declare module 'express-serve-static-core' {
    interface Request {
        rawBody?: Buffer;
    }
}
export declare class PaymentController {
    private readonly payments;
    constructor(payments: PaymentService);
    paystackWebhook(request: Request, signature: string | undefined, payload: unknown): Promise<{
        received: boolean;
        paid: boolean;
        idempotent: boolean;
        orderNumber: string;
        reference: string;
    } | {
        received: boolean;
        paid: boolean;
        orderNumber: string;
        reference: string;
        idempotent?: undefined;
    } | {
        received: boolean;
        ignored: boolean;
        reference: string;
        event: string;
    }>;
    verify(reference: string): Promise<{
        received: boolean;
        paid: boolean;
        idempotent: boolean;
        orderNumber: string;
        reference: string;
    } | {
        received: boolean;
        paid: boolean;
        orderNumber: string;
        reference: string;
        idempotent?: undefined;
    } | {
        received: boolean;
        paid: boolean;
        reference: string;
        status: any;
    }>;
}
export declare class AdminPaymentController {
    private readonly payments;
    constructor(payments: PaymentService);
    list(): Promise<import("./entities").PaymentTransaction[]>;
    summary(): Promise<{
        totalCount: number;
        totalPesewas: number;
        paidCount: number;
        paidPesewas: number;
        pendingCount: number;
        pendingPesewas: number;
        failedCount: number;
        failedPesewas: number;
        generatedAt: string;
    }>;
}
