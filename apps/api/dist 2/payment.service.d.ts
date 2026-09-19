import { DataSource, Repository } from 'typeorm';
import { Order, PaymentTransaction } from './entities';
type PaymentInitResult = {
    reference: string;
    authorizationUrl: string;
    accessCode: string;
    providerConfigured: boolean;
};
export declare class PaymentService {
    private readonly payments;
    private readonly dataSource;
    constructor(payments: Repository<PaymentTransaction>, dataSource: DataSource);
    initializePaystack(order: Order): Promise<PaymentInitResult | null>;
    listAdminPayments(): Promise<PaymentTransaction[]>;
    adminPaymentSummary(): Promise<{
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
    verifyPaystackSignature(rawBody: Buffer | undefined, signature: string | undefined): void;
    handlePaystackEvent(payload: any): Promise<{
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
    verifyPaystackReference(reference: string): Promise<{
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
    private markPaystackPaid;
    private callbackUrl;
}
export {};
