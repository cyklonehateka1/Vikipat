import { releaseProductionJobs } from './production-release';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { lockedFindOne } from './db';
import { NotificationOutbox, Order, OrderStatusHistory, PaymentTransaction } from './entities';

type PaymentInitResult = {
  reference: string;
  authorizationUrl: string;
  accessCode: string;
  providerConfigured: boolean;
};

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(PaymentTransaction) private readonly payments: Repository<PaymentTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  async initializePaystack(order: Order): Promise<PaymentInitResult | null> {
    if (order.requiresReview || order.totalPesewas <= 0) return null;
    const existing = order.paymentReference ? await this.payments.findOneBy({ reference: order.paymentReference }) : null;
    if (existing) {
      return {
        reference: existing.reference,
        authorizationUrl: existing.authorizationUrl,
        accessCode: existing.accessCode,
        providerConfigured: Boolean(existing.authorizationUrl),
      };
    }

    const reference = `VP-${order.orderNumber.replace('VP-', '')}-${randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
    const secret = process.env.PAYSTACK_SECRET_KEY || '';
    let authorizationUrl = '';
    let accessCode = '';
    let providerResponse = '{}';

    if (secret) {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: order.customerEmail,
          amount: order.totalPesewas,
          currency: 'GHS',
          reference,
          callback_url: this.callbackUrl(order, reference),
          channels: ['mobile_money', 'card'],
          metadata: { orderNumber: order.orderNumber, orderId: order.id, customerName: order.customerName },
        }),
      });
      const data = await response.json().catch(() => ({}));
      providerResponse = JSON.stringify(data);
      if (response.ok && data?.status && data?.data?.authorization_url) {
        authorizationUrl = String(data.data.authorization_url);
        accessCode = String(data.data.access_code || '');
      }
    }

    await this.payments.save(this.payments.create({
      orderId: order.id,
      orderNumber: order.orderNumber,
      provider: 'paystack',
      reference,
      amountPesewas: order.totalPesewas,
      currency: 'GHS',
      status: authorizationUrl ? 'initialized' : 'pending',
      authorizationUrl,
      accessCode,
      providerResponse,
    }));

    return { reference, authorizationUrl, accessCode, providerConfigured: Boolean(authorizationUrl) };
  }

  async listAdminPayments() {
    return this.payments.find({ order: { createdAt: 'DESC' }, take: 500 });
  }

  async adminPaymentSummary() {
    const payments = await this.payments.find();
    const total = payments.reduce((sum, payment) => sum + payment.amountPesewas, 0);
    const paid = payments.filter((payment) => payment.status === 'paid');
    const pending = payments.filter((payment) => ['initialized', 'pending'].includes(payment.status));
    const failed = payments.filter((payment) => ['failed', 'abandoned'].includes(payment.status));
    return {
      totalCount: payments.length,
      totalPesewas: total,
      paidCount: paid.length,
      paidPesewas: paid.reduce((sum, payment) => sum + payment.amountPesewas, 0),
      pendingCount: pending.length,
      pendingPesewas: pending.reduce((sum, payment) => sum + payment.amountPesewas, 0),
      failedCount: failed.length,
      failedPesewas: failed.reduce((sum, payment) => sum + payment.amountPesewas, 0),
      generatedAt: new Date().toISOString(),
    };
  }

  verifyPaystackSignature(rawBody: Buffer | undefined, signature: string | undefined) {
    const secret = process.env.PAYSTACK_SECRET_KEY || '';
    if (!secret) throw new BadRequestException('Paystack is not configured');
    if (!rawBody || !signature) throw new UnauthorizedException('Invalid Paystack signature');
    const digest = createHmac('sha512', secret).update(rawBody).digest('hex');
    const expected = Buffer.from(digest);
    const provided = Buffer.from(signature);
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
      throw new UnauthorizedException('Invalid Paystack signature');
    }
  }

  async handlePaystackEvent(payload: any) {
    const event = String(payload?.event || '');
    const data = payload?.data || {};
    const reference = String(data?.reference || '');
    if (!reference) throw new BadRequestException('Missing payment reference');
    if (event !== 'charge.success') return { received: true, ignored: true, reference, event };
    return this.markPaystackPaid(reference, data);
  }

  async verifyPaystackReference(reference: string) {
    const secret = process.env.PAYSTACK_SECRET_KEY || '';
    if (!secret) throw new BadRequestException('Paystack is not configured');
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.status) throw new BadRequestException('Could not verify payment');
    if (payload?.data?.status !== 'success') return { received: true, paid: false, reference, status: payload?.data?.status || 'unknown' };
    return this.markPaystackPaid(reference, payload.data);
  }

  private async markPaystackPaid(reference: string, data: any) {
    return this.dataSource.transaction(async (manager) => {
      const paymentRepo = manager.getRepository(PaymentTransaction);
      const orderRepo = manager.getRepository(Order);
      const historyRepo = manager.getRepository(OrderStatusHistory);
      const outboxRepo = manager.getRepository(NotificationOutbox);
      const payment = await lockedFindOne(manager, PaymentTransaction, {reference});
      if (!payment) throw new BadRequestException('Payment reference not found');
      const order = await lockedFindOne(manager, Order, {id: payment.orderId});
      if (!order) throw new BadRequestException('Payment order not found');
      const amount = Number(data?.amount || 0);
      const currency = String(data?.currency || payment.currency);
      if (amount !== payment.amountPesewas || currency !== payment.currency) {
        payment.status = 'failed';
        payment.providerResponse = JSON.stringify(data);
        await paymentRepo.save(payment);
        throw new BadRequestException('Payment amount or currency mismatch');
      }
      const alreadyPaid = payment.status === 'paid' && order.paymentStatus === 'paid';
      if (!alreadyPaid) {
        payment.status = 'paid';
        payment.providerResponse = JSON.stringify(data);
        await paymentRepo.save(payment);
        order.paymentStatus = 'paid';
        order.status = order.status === 'awaiting_payment' ? 'paid' : order.status;
        order.paymentProvider = 'paystack';
        order.paymentReference = reference;
        await orderRepo.save(order);
        await historyRepo.save(historyRepo.create({
          orderId: order.id,
          status: order.status,
          actor: 'paystack',
          customerVisible: true,
          note: 'Payment received. Your order status is shown in the tracking timeline.',
        }));
        await outboxRepo.save(outboxRepo.create({
          orderId: order.id,
          channel: 'email',
          recipient: order.customerEmail,
          template: 'payment_received',
          payload: JSON.stringify({ subject: `Vikipat order ${order.orderNumber}: payment received`, text: `Hello ${order.customerName}, payment has been received for order ${order.orderNumber}.` }),
        }));
      }
      // Hold/cancelled/review orders retain their payment record without releasing work.
      if (!order.requiresReview && !['cancelled', 'completed', 'on_hold'].includes(order.status)) {
        await releaseProductionJobs(manager, order.id, 'paystack');
      }
      return { received: true, paid: true, idempotent: alreadyPaid, orderNumber: order.orderNumber, reference };
    });
  }

  private callbackUrl(order: Order, reference: string) {
    const base = process.env.PAYSTACK_CALLBACK_URL || `${process.env.API_PUBLIC_URL || ''}/confirmation`;
    if (!base || base === '/confirmation') return undefined;
    const url = new URL(base);
    url.searchParams.set('orderNumber', order.orderNumber);
    url.searchParams.set('email', order.customerEmail);
    url.searchParams.set('payment', reference);
    return url.toString();
  }
}
