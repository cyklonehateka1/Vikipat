import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { lockedFindOne } from './db';
import { NotificationOutbox, Order, OrderItem, OrderStatusHistory, ProductionJob, ProductionJobActivity, StoreSettings } from './entities';

// The caller must own a transaction. All release entry points take this order lock.
export async function releaseProductionJobs(manager: EntityManager, orderId: string, actor: string) {
  const orders = manager.getRepository(Order);
  const order = await lockedFindOne(manager, Order, {id: orderId});
  if (!order) throw new NotFoundException('Order not found');
  const jobs = manager.getRepository(ProductionJob);
  const existing = await jobs.find({where: {orderId}, order: {jobNumber: 'ASC'}});
  const items = await manager.getRepository(OrderItem).find({where: {orderId}, order: {id: 'ASC'}});
  if (existing.length) {
    const itemIds = new Set(items.map(item => item.id));
    if (existing.length !== items.length || new Set(existing.map(job => job.orderItemId)).size !== items.length || existing.some(job => !itemIds.has(job.orderItemId))) {
      throw new ConflictException('Existing production jobs do not match the order items. A supervisor must reconcile this release before retrying.');
    }
    return {jobs: existing, notificationIds: [] as string[]};
  }
  if (['cancelled', 'completed', 'on_hold'].includes(order.status)) throw new BadRequestException('This order cannot be released in its current status');
  if (order.requiresReview) throw new BadRequestException('Order pricing must be reviewed before production release');
  if (order.paymentStatus !== 'paid' && !['walk_in', 'salesperson'].includes(order.source)) throw new BadRequestException('Online orders must be paid before production release');
  if (!items.length) throw new BadRequestException('An order must contain items before production release');

  // Validate all specifications before starting writes; never silently price/release corrupt work.
  const drafts = items.map((item, index) => {
    let spec: {needsDesign?: boolean};
    try {
      spec = JSON.parse(item.specification || '{}');
      if (!spec || typeof spec !== 'object' || Array.isArray(spec) || (spec.needsDesign !== undefined && typeof spec.needsDesign !== 'boolean')) throw new Error('Invalid specification');
    } catch {
      throw new BadRequestException(`Order item ${item.id} has an invalid specification`);
    }
    return jobs.create({orderId, orderItemId: item.id, orderNumber: order.orderNumber,
      jobNumber: `${order.orderNumber}-J${String(index + 1).padStart(2, '0')}`,
      customerName: order.customerName, serviceCode: item.serviceCode, title: item.name,
      quantity: item.quantity, stage: spec.needsDesign ? 'artwork_review' : 'intake',
      dueDate: order.promisedDate || '', specification: item.specification});
  });
  const created = await jobs.save(drafts);
  const activity = manager.getRepository(ProductionJobActivity);
  await activity.save(created.map(job => activity.create({jobId: job.id, orderId, jobNumber: job.jobNumber,
    type: 'system', toStage: job.stage, note: 'Production job released from order intake.', actor})));
  order.status = created.some(job => job.stage === 'artwork_review') ? 'artwork_review' : 'ready_for_production';
  await orders.save(order);
  const note = order.status === 'artwork_review' ? 'Artwork/design review is required before production.' : 'Order released into production intake.';
  await manager.getRepository(OrderStatusHistory).save({orderId, status: order.status, actor, customerVisible: true, note});
  const payload = JSON.stringify({subject: `Vikipat order ${order.orderNumber}: production intake`, text: `Hello ${order.customerName}, ${note}`});
  const outbox = manager.getRepository(NotificationOutbox);
  const email = await outbox.save(outbox.create({orderId, channel: 'email', recipient: order.customerEmail, template: 'order_status', payload}));
  const notificationIds = [email.id];
  if (order.customerPhone) {
    const settings = (await manager.getRepository(StoreSettings).find({take: 1}))[0];
    if (settings?.whatsappNotificationsEnabled) {
      const whatsapp = await outbox.save(outbox.create({orderId, channel: 'whatsapp', recipient: order.customerPhone, template: 'order_status', payload}));
      notificationIds.push(whatsapp.id);
    }
  }
  return {jobs: created, notificationIds};
}
