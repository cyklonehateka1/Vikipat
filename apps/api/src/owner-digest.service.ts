import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { PaymentTransaction } from './entities';
import { ghs } from './finance';
import { MailService } from './mail.service';
import { MaterialService } from './material.service';
import { OrderService } from './order.service';

const plural = (n: number, word: string, pluralForm = `${word}s`) => `${n} ${n === 1 ? word : pluralForm}`;

/**
 * One email a day, covering what the owner would otherwise only see by
 * being in the shop: orders, money collected, and every review flag from
 * this project's leakage-detection work (custom-priced items, late
 * cancellations/refunds, unattended production, low material stock).
 */
@Injectable()
export class OwnerDigestService {
  constructor(
    private orders: OrderService,
    private materials: MaterialService,
    @InjectRepository(PaymentTransaction) private payments: Repository<PaymentTransaction>,
    private mail: MailService,
  ) {}

  async buildDigest(forDate: string) {
    const start = new Date(`${forDate}T00:00:00.000Z`), end = new Date(`${forDate}T23:59:59.999Z`);
    const [created, customPriced, lateCancellations, unattendedJobs, materials, payments] = await Promise.all([
      this.orders.ordersCreatedOn(forDate),
      this.orders.flagCustomPricedItems(forDate, forDate),
      this.orders.flagLateCancellations(forDate, forDate),
      this.orders.flagUnattendedJobs(forDate),
      this.materials.list(),
      this.payments.find({ where: { status: 'paid', paidAt: Between(start, end) } }),
    ]);
    const collectedPesewas = payments.reduce((sum, p) => sum + p.amountPesewas, 0);
    const lowStock = materials.filter((m) => m.lowStock);
    const lines = [
      `${plural(created.count, 'order')}, ${ghs(collectedPesewas)} collected.`,
      `${plural(customPriced.length, 'custom-priced item')} to review.`,
      `${plural(lateCancellations.length, 'late cancellation or refund', 'late cancellations or refunds')}.`,
      `${plural(unattendedJobs.length, 'unattended production stage change')}.`,
      lowStock.length ? `Low stock: ${lowStock.map((m) => m.name).join(', ')}.` : 'No materials low on stock.',
    ];
    return { subject: `Vikipat daily digest: ${forDate}`, text: lines.join('\n') };
  }

  // Ghana has no DST and sits at UTC+0, so this cron time is also 7am Accra time.
  @Cron(CronExpression.EVERY_DAY_AT_7AM, { name: 'owner-daily-digest' })
  async send() {
    const forDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const digest = await this.buildDigest(forDate);
    await this.mail.send({
      to: process.env.ADMIN_EMAIL || 'hello@vikipat.com',
      subject: digest.subject,
      text: digest.text,
      idempotencyKey: `owner-digest-${forDate}`,
    });
  }
}
