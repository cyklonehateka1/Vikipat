import { Order, PaymentTransaction } from './entities';
/** An amount for people to read: whole cedis, e.g. "GHS 1,250". */
export const ghs = (pesewas: number) => `GHS ${Math.round(pesewas / 100).toLocaleString('en-GH')}`;
export const successfulPayment = (p: PaymentTransaction) => ['paid', 'refunded'].includes(p.status);
export function collectedFor(order: Order, payments: PaymentTransaction[]) {
  return payments.filter(p => p.orderId === order.id && successfulPayment(p)).reduce((s,p) => s+p.amountPesewas,0);
}
export function balances(order: Order, payments: PaymentTransaction[]) {
  const collectedPesewas = collectedFor(order,payments);
  const refundedPesewas = order.refundedPesewas || 0;
  return {collectedPesewas, refundedPesewas, refundablePesewas: Math.max(0,collectedPesewas-refundedPesewas), outstandingPesewas: order.status==='cancelled'?0:Math.max(0,order.totalPesewas-collectedPesewas), netCollectedPesewas:collectedPesewas-refundedPesewas};
}
export function paymentState(total: number, collected: number, refunded: number): Order['paymentStatus'] {
  if(refunded>0) return refunded>=collected?'refunded':'part_refunded';
  return collected>=total && collected>0?'paid':collected>0?'part_paid':'unpaid';
}
export function dateOnly(value:string) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10)!==value) throw new Error('Enter a valid calendar date');
  return value;
}
