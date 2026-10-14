import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Copy, MessageCircle, Package } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Loader, OrderProgress } from '../components/Dots';
import { StatusPanel } from '../components/ProductGrid';
import { useToast } from '../components/Toast';
import { API_BASE } from '../lib/api';
import { whatsappLink } from '../lib/format';
import { useTitle } from '../lib/useTitle';
import { site } from '../site';
import '../styles/pages/confirmation.css';

type PaymentStatus = 'none' | 'checking' | 'paid' | 'pending';

export default function OrderConfirmation() {
  const [params] = useSearchParams();
  const orderNumber = params.get('orderNumber') || '';
  const email = params.get('email') || '';
  const paymentReference = params.get('payment') || params.get('reference') || '';
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(paymentReference ? 'checking' : 'none');
  const { show } = useToast();

  useTitle(orderNumber ? `Order ${orderNumber} received | ${site.fullName}` : `Order received | ${site.fullName}`);

  useEffect(() => {
    if (!paymentReference) return;
    let cancelled = false;
    fetch(`${API_BASE}/payments/paystack/verify/${encodeURIComponent(paymentReference)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Payment is not confirmed yet.');
        if (!cancelled) setPaymentStatus(data.paid ? 'paid' : 'pending');
      })
      .catch(() => {
        if (!cancelled) setPaymentStatus('pending');
      });
    return () => {
      cancelled = true;
    };
  }, [paymentReference]);

  if (!orderNumber) {
    return (
      <AppShell title="Order" back="/">
        <div className="container section">
          <StatusPanel title="No order to show here" note="Your order number is in the email we sent you. Use it to track your order.">
            <Link className="btn btn-primary" to="/track-order">
              Track an order
            </Link>
          </StatusPanel>
        </div>
      </AppShell>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(orderNumber);
      show(`Order number ${orderNumber} copied`);
    } catch {
      show(`Write this down: ${orderNumber}`);
    }
  };

  const progressStatus =
    paymentStatus === 'paid' ? 'Payment received' : paymentStatus === 'none' ? 'Under review' : 'Awaiting payment';
  const trackHref = `/track-order?order=${encodeURIComponent(orderNumber)}${email ? `&email=${encodeURIComponent(email)}` : ''}`;

  const steps = [
    { title: 'Receipt', text: `We email your receipt${email ? ` to ${email}` : ''}.` },
    { title: 'Artwork check', text: 'We check your artwork and send a proof if something needs your approval.' },
    { title: 'Print and hand-over', text: 'We print, then message you when it is ready for pickup or on its way.' },
  ];

  return (
    <AppShell title="Order received" back="/">
      <div className="container cf">
        <section className="cf-hero" aria-labelledby="confirm-title">
          <span className="cf-mark" aria-hidden="true">
            <CheckCircle2 />
          </span>
          <h1 id="confirm-title">Thank you, we have your order</h1>
          <p>
            {email ? (
              <>
                Your receipt is on its way to <b>{email}</b>.
              </>
            ) : (
              'Keep your order number to track it.'
            )}
          </p>
        </section>

        <section className="cf-card" aria-label="Order details">
          <div className="cf-number">
            <span className="cf-number-text">
              <span className="cf-label">Order number</span>
              <span className="cf-number-value num">{orderNumber}</span>
            </span>
            <button type="button" className="cf-copy" onClick={copy}>
              <Copy aria-hidden="true" />
              Copy
            </button>
          </div>

          <p className={`cf-status is-${paymentStatus}`} role="status">
            {paymentStatus === 'checking' && (
              <>
                <Loader label="Checking payment" />
                Checking your payment with Paystack
              </>
            )}
            {paymentStatus === 'paid' && 'Payment received. Your order is going to production review.'}
            {paymentStatus === 'pending' &&
              'Payment not confirmed yet. If you approved it on your phone, this updates by itself once Paystack tells us.'}
            {paymentStatus === 'none' && 'We will confirm the price with you before you pay.'}
          </p>

          <div className="cf-progress">
            <OrderProgress status={progressStatus} />
          </div>
        </section>

        <section className="cf-card" aria-labelledby="next-title">
          <h2 className="cf-title" id="next-title">
            What happens next
          </h2>
          <ol className="cf-steps">
            {steps.map((step, index) => (
              <li key={step.title}>
                <span className="cf-step-num" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="cf-step-body">
                  <b>{step.title}</b>
                  <span>{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <div className="cf-actions">
          <Link className="cf-btn is-primary" to={trackHref}>
            <Package aria-hidden="true" />
            Track this order
          </Link>
          <a
            className="cf-btn"
            href={whatsappLink(`Hello ${site.name}, I just placed order ${orderNumber}. Can you confirm you received it?`)}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle className="wa" aria-hidden="true" />
            Message us on WhatsApp
          </a>
        </div>
      </div>
    </AppShell>
  );
}
