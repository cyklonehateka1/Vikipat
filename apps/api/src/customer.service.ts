import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Customer, Order, PaymentTransaction } from './entities';
import { balances } from './finance';

const normaliseEmail = (value?: string) => (value || '').trim().toLowerCase();

/**
 * Ghanaian numbers arrive as 024 822 6831, 0248226831 or +233248226831 and are
 * all the same person, so they collapse to a single national-format key.
 */
export function canonicalPhone(value?: string): string {
  const digits = (value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00233')) return `0${digits.slice(5)}`;
  if (digits.startsWith('233') && digits.length >= 12) return `0${digits.slice(3)}`;
  return digits;
}

/** Delimited on both sides so a LIKE cannot match a number inside another. */
const phoneIndexOf = (phones: string[]) => {
  const keys = [...new Set(phones.map(canonicalPhone).filter(Boolean))];
  return keys.length ? `,${keys.join(',')},` : '';
};

export interface CustomerProfile {
  id: string;
  email: string;
  name: string;
  company: string;
  phones: string[];
  orderCount: number;
  lifetimeValuePesewas: number;
  averageOrderPesewas: number;
  firstOrderAt: Date | null;
  lastOrderAt: Date | null;
}

/**
 * Customers are derived from guest orders rather than sign-ups. Email is the
 * preferred identity because it is unique and stable, but a walk-in customer
 * often gives only a phone number, so a phone is a full identity in its own
 * right. When someone who has only ever given a phone later supplies an
 * email, the two records are merged rather than left as two half-histories.
 */
@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(PaymentTransaction) private readonly payments: Repository<PaymentTransaction>,
  ) {}

  private parsePhones(raw: string): string[] {
    try {
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed.filter((p) => typeof p === 'string') : [];
    } catch {
      return [];
    }
  }

  private async findByPhone(manager: EntityManager, phone: string) {
    const key = canonicalPhone(phone);
    if (!key) return null;
    return manager
      .getRepository(Customer)
      .createQueryBuilder('c')
      .where('c.phoneIndex LIKE :key', { key: `%,${key},%` })
      .orderBy('c.createdAt', 'ASC')
      .getOne();
  }

  /**
   * Folds a phone-only record into the record that owns the email, so the
   * walk-in history and the online history become one customer.
   */
  private async merge(manager: EntityManager, keep: Customer, absorb: Customer) {
    const phones = [...this.parsePhones(keep.phones), ...this.parsePhones(absorb.phones)];
    const unique: string[] = [];
    for (const phone of phones) {
      if (!unique.some((p) => canonicalPhone(p) === canonicalPhone(phone))) unique.push(phone);
    }
    keep.phones = JSON.stringify(unique.slice(0, 10));
    keep.phoneIndex = phoneIndexOf(unique);
    keep.orderCount += absorb.orderCount;
    keep.lifetimeValuePesewas += absorb.lifetimeValuePesewas;
    if (!keep.name && absorb.name) keep.name = absorb.name;
    if (!keep.company && absorb.company) keep.company = absorb.company;
    if (absorb.firstOrderAt && (!keep.firstOrderAt || absorb.firstOrderAt < keep.firstOrderAt)) keep.firstOrderAt = absorb.firstOrderAt;
    if (absorb.lastOrderAt && (!keep.lastOrderAt || absorb.lastOrderAt > keep.lastOrderAt)) keep.lastOrderAt = absorb.lastOrderAt;

    await manager.getRepository(Order).update({ customerId: absorb.id }, { customerId: keep.id });
    await manager.getRepository(Customer).delete({ id: absorb.id });
  }

  /**
   * Finds or creates the customer for an order, inside the order's own
   * transaction so a failed order never leaves an orphan profile behind.
   * Returns the customer id to stamp on the order row, or '' when the order
   * carries neither an email nor a phone to identify anyone by.
   */
  async linkOrder(
    manager: EntityManager,
    input: { email?: string; name: string; phone?: string; company?: string; totalPesewas: number; placedAt?: Date },
  ): Promise<string> {
    const email = normaliseEmail(input.email);
    const phone = (input.phone || '').trim();
    const phoneKey = canonicalPhone(phone);
    if (!email && !phoneKey) return '';

    const repo = manager.getRepository(Customer);
    const placedAt = input.placedAt ?? new Date();

    let customer = email ? await repo.findOneBy({ email }) : null;
    const byPhone = phoneKey ? await this.findByPhone(manager, phone) : null;

    if (customer && byPhone && byPhone.id !== customer.id && !byPhone.email) {
      // This phone belonged to a walk-in who has now given us an email.
      await this.merge(manager, customer, byPhone);
    } else if (!customer && byPhone) {
      // Either a phone-only customer returning, or one who is now naming an
      // email for the first time. Only claim the email if nobody else holds it.
      if (!email || !byPhone.email) {
        customer = byPhone;
        if (email && !byPhone.email) customer.email = email;
      }
    }

    if (!customer) {
      customer = repo.create({
        // Null rather than '' so several phone-only customers can coexist
        // under the unique email index.
        email: email || null,
        name: input.name?.trim() || '',
        company: input.company?.trim() || '',
        phones: '[]',
        phoneIndex: '',
        orderCount: 0,
        lifetimeValuePesewas: 0,
        firstOrderAt: placedAt,
      });
    }

    // The most recent name/company wins: people correct their own details
    // over time, and the latest order is the best evidence we have.
    if (input.name?.trim()) customer.name = input.name.trim();
    if (input.company?.trim()) customer.company = input.company.trim();

    if (phone) {
      const existing = this.parsePhones(customer.phones);
      if (!existing.some((p) => canonicalPhone(p) === phoneKey)) {
        const merged = [phone, ...existing].slice(0, 10);
        customer.phones = JSON.stringify(merged);
        customer.phoneIndex = phoneIndexOf(merged);
      }
    }

    customer.orderCount += 1;
    customer.lifetimeValuePesewas += Math.max(0, input.totalPesewas);
    customer.lastOrderAt = placedAt;
    if (!customer.firstOrderAt) customer.firstOrderAt = placedAt;

    const saved = await repo.save(customer);
    return saved.id;
  }

  /** Keeps lifetime value honest when money goes back out the door. */
  async applyRefund(manager: EntityManager, customerId: string, refundPesewas: number) {
    if (!customerId || refundPesewas <= 0) return;
    const repo = manager.getRepository(Customer);
    const customer = await repo.findOneBy({ id: customerId });
    if (!customer) return;
    customer.lifetimeValuePesewas = Math.max(0, customer.lifetimeValuePesewas - refundPesewas);
    await repo.save(customer);
  }

  private toProfile(customer: Customer, collected: number): CustomerProfile {
    return {
      id: customer.id,
      email: customer.email || '',
      name: customer.name,
      company: customer.company,
      phones: this.parsePhones(customer.phones),
      orderCount: customer.orderCount,
      // Cash actually received less refunds, matching the analytics basis, so
      // an unpaid order never inflates someone's apparent value.
      lifetimeValuePesewas: collected,
      averageOrderPesewas: customer.orderCount ? Math.round(collected / customer.orderCount) : 0,
      firstOrderAt: customer.firstOrderAt,
      lastOrderAt: customer.lastOrderAt,
    };
  }

  /** Net collected per customer, derived from payments rather than order totals. */
  private async collectedByCustomer(ids: string[]) {
    const totals = new Map<string, number>();
    if (!ids.length) return totals;
    const orders = await this.orders.find();
    const payments = await this.payments.find();
    for (const order of orders) {
      if (!order.customerId || !ids.includes(order.customerId)) continue;
      const { netCollectedPesewas } = balances(order, payments);
      totals.set(order.customerId, (totals.get(order.customerId) || 0) + netCollectedPesewas);
    }
    return totals;
  }

  async list(search = '') {
    const query = this.customers.createQueryBuilder('c').orderBy('c.lastOrderAt', 'DESC').limit(200);
    const term = search.trim().toLowerCase();
    if (term) {
      const phoneKey = canonicalPhone(term);
      query.where('lower(c.email) LIKE :term OR lower(c.name) LIKE :term', { term: `%${term}%` });
      if (phoneKey) query.orWhere('c.phoneIndex LIKE :phone', { phone: `%${phoneKey}%` });
    }
    const rows = await query.getMany();
    const collected = await this.collectedByCustomer(rows.map((r) => r.id));
    return rows.map((c) => this.toProfile(c, collected.get(c.id) || 0));
  }

  async one(id: string) {
    const customer = await this.customers.findOneBy({ id });
    if (!customer) return null;
    const orders = await this.orders.find({ where: { customerId: id }, order: { createdAt: 'DESC' } });
    const payments = await this.payments.find();
    const collected = orders.reduce((sum, o) => sum + balances(o, payments).netCollectedPesewas, 0);
    return {
      ...this.toProfile(customer, collected),
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        source: o.source,
        status: o.status,
        paymentStatus: o.paymentStatus,
        totalPesewas: o.totalPesewas,
        refundedPesewas: o.refundedPesewas,
        createdAt: o.createdAt,
      })),
    };
  }
}
