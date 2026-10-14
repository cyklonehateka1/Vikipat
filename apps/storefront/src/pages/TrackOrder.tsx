import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, MessageCircle, RotateCcw, ShieldCheck } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Loader, OrderProgress } from '../components/Dots';
import { API_BASE } from '../lib/api';
import { cedisFromPesewas, whatsappLink } from '../lib/format';
import { progressFor, STAGES } from '../lib/progress';
import { useTitle } from '../lib/useTitle';
import { site } from '../site';
import '../styles/pages/track.css';

type OrderView = {
  orderNumber: string;
  customerName: string;
  status: string;
  paymentStatus: string;
  totalPesewas: number;
  promisedDate: string;
  createdAt: string;
  updatedAt: string;
  items: { name: string; quantity: number; totalPesewas: number; specification: Record<string, unknown> }[];
  timeline: { status: string; note: string; createdAt: string }[];
};

const ORDER_PATTERN = /^VP-[A-Z0-9]{8}$/;

const dateTime = (value: string) =>
  new Date(value).toLocaleString('en-GH', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const dateOnly = (value: string) =>
  new Date(value).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });

const words = (value: string) => {
  const text = value.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** The colour of the dot a status belongs to, for the update timeline. */
function statusColor(status: string) {
  const { lit, current } = progressFor(status);
  const index = current ?? lit - 1;
  return index >= 0 ? STAGES[index].color : 'var(--line-strong)';
}

async function post(path: string, body: unknown, withCookies = false) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: withCookies ? 'include' : 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(data.message) ? data.message.join('. ') : data.message;
    throw new Error(message || 'Something went wrong. Please try again.');
  }
  return data;
}

export default function TrackOrder() {
  useTitle(`Track your order | ${site.fullName}`);
  const [params] = useSearchParams();
  const [step, setStep] = useState<'identify' | 'verify' | 'order'>('identify');
  const [orderNumber, setOrderNumber] = useState((params.get('order') || '').toUpperCase());
  const [email, setEmail] = useState(params.get('email') || '');
  const [code, setCode] = useState('');
  const [order, setOrder] = useState<OrderView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const cleanNumber = orderNumber.trim().toUpperCase();
  const cleanEmail = email.trim().toLowerCase();

  const request = async (event?: React.SyntheticEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!ORDER_PATTERN.test(cleanNumber)) {
      setError('Enter the order number from your email. It looks like VP-AB12CD34.');
      document.getElementById('track-number')?.focus();
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError('Enter the email address you used for the order.');
      document.getElementById('track-email')?.focus();
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await post('/order-tracking/request-otp', { orderNumber: cleanNumber, email: cleanEmail });
      setNotice(data.devOtp ? `Development code: ${data.devOtp}` : data.message || `We sent a code to ${cleanEmail}.`);
      setCode('');
      setStep('verify');
    } catch (thrown) {
      setError(thrown instanceof TypeError ? 'We could not reach Vikipat. Check your connection.' : (thrown as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await post('/order-tracking/verify-otp', { orderNumber: cleanNumber, email: cleanEmail, code }, true);
      setOrder(data.order);
      setStep('order');
      window.scrollTo({ top: 0 });
    } catch (thrown) {
      setError(
        thrown instanceof TypeError ? 'We could not reach Vikipat. Check your connection.' : (thrown as Error).message,
      );
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep('identify');
    setCode('');
    setError('');
    setNotice('');
    setOrder(null);
  };

  const errorBox = error && (
    <p className="form-alert" role="alert">
      <AlertCircle aria-hidden="true" />
      <span>{error}</span>
    </p>
  );

  return (
    <AppShell>
      <div className="container track">
        {step !== 'order' && (
          <header className="page-intro">
            <h1 className="title">Track your order</h1>
            <p>No account needed. We send a one-time code to the email on your order before showing it.</p>
          </header>
        )}

        {step === 'identify' && (
          <form className="track-card track-form" onSubmit={request} noValidate>
            <div className="field">
              <label className="field-label" htmlFor="track-number">
                Order number
              </label>
              <input
                id="track-number"
                className="input track-code-field"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="VP-AB12CD34"
                value={orderNumber}
                onChange={(event) => setOrderNumber(event.target.value.toUpperCase())}
              />
              <p className="field-hint">It is in your confirmation email.</p>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="track-email">
                Email
              </label>
              <input
                id="track-email"
                className="input"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            {errorBox}
            <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
              {busy ? <Loader label="Sending" /> : 'Send me a code'}
            </button>
            <p className="track-trust">
              <ShieldCheck aria-hidden="true" />
              Only someone with access to that email can see the order.
            </p>
          </form>
        )}

        {step === 'verify' && (
          <form className="track-card track-form" onSubmit={verify} noValidate>
            <div>
              <h2 className="heading">Enter the 6-digit code</h2>
              <p className="track-sub">
                We sent it to <strong>{cleanEmail}</strong>. It works for 10 minutes.
              </p>
            </div>
            {notice && <p className="track-notice">{notice}</p>}
            <div className="field">
              <label className="field-label" htmlFor="track-otp">
                Code
              </label>
              <input
                id="track-otp"
                className="input track-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                autoFocus
              />
            </div>
            {errorBox}
            <button className="btn btn-primary btn-lg btn-block" disabled={busy || code.length !== 6}>
              {busy ? <Loader label="Checking" /> : 'Show my order'}
            </button>
            <div className="track-links">
              <button type="button" className="btn btn-ghost" onClick={() => request()} disabled={busy}>
                Send a new code
              </button>
              <button type="button" className="btn btn-ghost" onClick={reset}>
                Use different details
              </button>
            </div>
          </form>
        )}

        {step === 'order' && order && (
          <>
            <section className="track-card track-status" aria-labelledby="status-title">
              <span className="track-number num">Order {order.orderNumber}</span>
              <h1 className="title" id="status-title">
                {order.status}
              </h1>
              <p className="track-sub">Hi {order.customerName.split(' ')[0]}, here is where your order is now.</p>
              <OrderProgress status={order.status} />
              <dl className="track-facts">
                <div>
                  <dt>Total</dt>
                  <dd className="num">{cedisFromPesewas(order.totalPesewas)}</dd>
                </div>
                <div>
                  <dt>Payment</dt>
                  <dd>{words(order.paymentStatus)}</dd>
                </div>
                <div>
                  <dt>{order.promisedDate ? 'Needed by' : 'Placed'}</dt>
                  <dd>{dateOnly(order.promisedDate || order.createdAt)}</dd>
                </div>
              </dl>
            </section>

            <section className="track-card" aria-labelledby="items-title">
              <h2 className="heading" id="items-title">
                In this order
              </h2>
              <ul className="track-items">
                {order.items.map((item, index) => (
                  <li key={`${item.name}-${index}`}>
                    <span>
                      <span className="track-item-name">{item.name}</span>
                      <span className="track-item-meta">Quantity {item.quantity}</span>
                    </span>
                    <span className="price">{cedisFromPesewas(item.totalPesewas)}</span>
                  </li>
                ))}
              </ul>
            </section>

            {order.timeline.length > 0 && (
              <section className="track-card" aria-labelledby="updates-title">
                <h2 className="heading" id="updates-title">
                  Updates
                </h2>
                <ol className="track-timeline">
                  {[...order.timeline].reverse().map((event, index) => (
                    <li key={`${event.createdAt}-${index}`}>
                      <span className="track-timeline-dot" style={{ background: statusColor(event.status) }} />
                      <span className="track-timeline-body">
                        <span className="track-timeline-status">{event.status}</span>
                        {event.note && <span className="track-timeline-note">{event.note}</span>}
                        <time dateTime={event.createdAt}>{dateTime(event.createdAt)}</time>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <div className="track-actions">
              <a
                className="btn btn-secondary btn-lg btn-block"
                href={whatsappLink(`Hello ${site.name}, I have a question about order ${order.orderNumber}.`)}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="wa" aria-hidden="true" />
                Ask about this order on WhatsApp
              </a>
              <button type="button" className="btn btn-ghost btn-block" onClick={reset}>
                <RotateCcw aria-hidden="true" />
                Track another order
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
