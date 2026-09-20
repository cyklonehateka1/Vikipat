import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, In, Repository } from 'typeorm';
import { NotificationOutbox, Order, PaymentTransaction } from './entities';
import { NotificationService } from './notification.service';
import { PaymentService } from './payment.service';

/** Give the customer time to finish on Paystack's page before chasing it. */
const MIN_AGE_MINUTES = 3;
/** Past this, a pending charge is almost certainly abandoned, not in flight. */
const MAX_AGE_HOURS = 24;
const BATCH_SIZE = 40;

/**
 * The webhook is the fast path; this is the safety net. Webhooks get missed —
 * a deploy mid-delivery, a timeout, Paystack retrying against a cold
 * container — and a customer who has genuinely paid must not sit in
 * "awaiting payment" because of it. Every few minutes this asks Paystack
 * directly about anything still pending.
 */
@Injectable()
export class PaymentReconciliationService {
  private readonly logger = new Logger(PaymentReconciliationService.name);
  private running = false;

  constructor(
    @InjectRepository(PaymentTransaction) private readonly payments: Repository<PaymentTransaction>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(NotificationOutbox) private readonly outbox: Repository<NotificationOutbox>,
    private readonly paymentService: PaymentService,
    private readonly notifications: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'paystack-reconciliation' })
  async reconcilePending() {
    if (!process.env.PAYSTACK_SECRET_KEY) return;
    // Overlapping runs would verify the same references twice and burn rate
    // limit for nothing; a slow batch simply skips the next tick.
    if (this.running) return;
    this.running = true;
    try {
      const now = Date.now();
      const pending = await this.payments.find({
        where: {
          status: In(['pending','initialized']),
          provider: 'paystack',
          createdAt: LessThan(new Date(now - MIN_AGE_MINUTES * 60_000)) as unknown as Date,
        },
        order: { createdAt: 'ASC' },
        take: BATCH_SIZE,
      });

      let settled = 0;
      let abandoned = 0;

      for (const payment of pending) {
        const ageHours = (now - payment.createdAt.getTime()) / 3_600_000;
        try {
          const result: any = await this.paymentService.verifyPaystackReference(payment.reference);
          if (result?.paid !== false) {
            settled += 1;
            continue;
          }
          // Still not paid. Once it is old enough there is nothing left to
          // wait for, so stop asking about it on every run.
          if (ageHours > MAX_AGE_HOURS) {
            payment.status = 'abandoned';
            await this.payments.save(payment);
            abandoned += 1;
          }
        } catch (error) {
          this.logger.warn(
            `Could not reconcile ${payment.reference}: ${error instanceof Error ? error.message : error}`,
          );
        }
      }

      if (settled || abandoned) {
        this.logger.log(`Reconciliation: ${settled} settled, ${abandoned} abandoned, ${pending.length} checked`);
      }
    } finally {
      this.running = false;
    }
  }

  /**
   * Notification delivery is best-effort at the moment it happens; this
   * retries anything that failed, so a transient Resend or WhatsApp outage
   * does not silently cost a customer their order confirmation.
   */
  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'notification-retry' })
  async retryFailedNotifications() {
    await this.outbox.update({status:'sending',updatedAt:LessThan(new Date(Date.now()-30*60000))},{status:'failed',lastError:'Delivery interrupted; retry uses the same provider idempotency key'});
    const stuck = await this.outbox.find({
      where: [{status:'pending'}, { status: 'failed', attempts: LessThan(5), updatedAt:LessThan(new Date(Date.now()-10*60000)) }],
      order: { updatedAt: 'ASC' },
      take: 25,
    });
    if (!stuck.length) return;
    await this.notifications.deliverQueued(stuck.map((record) => record.id));
    this.logger.log(`Retried ${stuck.length} failed notification(s)`);
  }

  /** Expired quotes are only kept for the audit trail; trim them nightly. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'estimate-cleanup' })
  async pruneExpiredEstimates() {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.orders.manager
      .createQueryBuilder()
      .delete()
      .from('estimates')
      .where('"createdAt" < :cutoff', { cutoff })
      .execute();
    if (result.affected) this.logger.log(`Pruned ${result.affected} expired estimate(s)`);
  }

  /** Lets an admin force a sweep instead of waiting for the next tick. */
  async runNow() {
    await this.reconcilePending();
    await this.retryFailedNotifications();
    return { success: true, ranAt: new Date().toISOString() };
  }
}
