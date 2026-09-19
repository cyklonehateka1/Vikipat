import { Repository } from 'typeorm';
import { NotificationOutbox, Order, StoreSettings } from './entities';
export declare class NotificationService {
    private outbox;
    private settings;
    private readonly logger;
    constructor(outbox: Repository<NotificationOutbox>, settings: Repository<StoreSettings>);
    queueEmail(order: Order, template: string, payload: Record<string, unknown>): Promise<void>;
    queueWhatsApp(order: Order, template: string, payload: Record<string, unknown>): Promise<void>;
    private deliver;
    private sendEmail;
    private sendWhatsApp;
}
