import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronDown, MapPin, ShieldCheck, Smartphone, Truck } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Loader } from '../components/Dots';
import { Price } from '../components/Primitives';
import { StatusPanel } from '../components/ProductGrid';
import { useOrder } from '../order';
import { API_BASE } from '../lib/api';
import { cedis, cedisFromPesewas } from '../lib/format';
import { useTitle } from '../lib/useTitle';
import { site } from '../site';
import '../styles/pages/checkout.css';

/** One order-level artwork submission is derived from the per-job choices
 * made in the print flow: design service wins (it needs studio review
 * regardless of what else was attached), then an actual uploaded file,
 * then a shared link, and "later" only if nothing else was given. */
function deriveOrderArtwork(customJobs: ReturnType<typeof useOrder>['customJobs']) {
  const designJob = customJobs.find((j) => j.artworkOption === 'design_service');
  if (designJob) return { artworkOption: 'design_service' as const, artworkUrl: '', artworkName: '', artworkLink: '' };
  const uploadJob = customJobs.find((j) => j.artworkOption === 'upload' && j.artworkUrl);
  if (uploadJob) {
    return {
      artworkOption: 'upload' as const,
      artworkUrl: uploadJob.artworkUrl || '',
      artworkName: uploadJob.artworkName || '',
      artworkLink: '',
    };
  }
  const linkJob = customJobs.find((j) => j.artworkOption === 'link' && j.artworkLink);
  if (linkJob) return { artworkOption: 'link' as const, artworkUrl: '', artworkName: '', artworkLink: linkJob.artworkLink || '' };
  return { artworkOption: 'later' as const, artworkUrl: '', artworkName: '', artworkLink: '' };
}

const artworkSummary: Record<string, string> = {
  upload: 'File uploaded',
  link: 'Shared via cloud link',
  design_service: 'Vikipat studio will design this',
  later: 'Will be sent later via WhatsApp',
};

type Fields = {
  name: string;
  phone: string;
  email: string;
  company: string;
  address: string;
  landmark: string;
  date: string;
  note: string;
};

type FieldKey = keyof Fields | 'payment';

function validate(fields: Fields, delivery: boolean, payment: string) {
  const errors: Partial<Record<FieldKey, string>> = {};
  if (fields.name.trim().length < 2) errors.name = 'Enter your name.';
  if (!/^[+0-9 ()-]{8,24}$/.test(fields.phone.trim()))
    errors.phone = 'Enter a phone number we can reach, like 024 000 0000.';
  if (!/^\S+@\S+\.\S+$/.test(fields.email.trim())) errors.email = 'Enter an email address, like you@example.com.';
  if (delivery && fields.address.trim().length < 3) errors.address = 'Tell us where to deliver.';
  if (payment !== 'mobile_money') errors.payment = 'Choose Mobile Money to continue.';
  return errors;
}

const order: FieldKey[] = ['name', 'phone', 'email', 'address', 'payment'];

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p className="field-error" id={id}>
      <AlertCircle aria-hidden="true" />
      {message}
    </p>
  );
}

export default function Checkout() {
  useTitle(`Checkout | ${site.fullName}`);
  const navigate = useNavigate();
  const { items, customJobs, total, count, clear, updateCustomJobEstimate } = useOrder();

  const [fields, setFields] = useState<Fields>({
    name: '',
    phone: '',
    email: '',
    company: '',
    address: '',
    landmark: '',
    date: '',
    note: '',
  });
  const [fulfilmentMethod, setFulfilmentMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | ''>('');
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [pricesRefreshed, setPricesRefreshed] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);

  const delivery = fulfilmentMethod === 'delivery';
  const errors = validate(fields, delivery, paymentMethod);
  const shown = (key: FieldKey) => (touched[key] ? errors[key] : undefined);
  const needsReview = customJobs.some((job) => job.estimate.requiresReview || job.artworkOption === 'design_service');
  const isEmpty = items.length === 0 && customJobs.length === 0;
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!submitError) return;
    alertRef.current?.focus({ preventScroll: true });
    alertRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [submitError]);

  const set = (key: keyof Fields) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields((current) => ({ ...current, [key]: event.target.value }));
  const blur = (key: FieldKey) => () => setTouched((current) => ({ ...current, [key]: true }));
  const aria = (key: FieldKey) => ({
    'aria-invalid': Boolean(shown(key)),
    'aria-describedby': shown(key) ? `${key}-error` : undefined,
  });

  const handleSubmitOrder = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate(fields, delivery, paymentMethod);
    setTouched({ name: true, phone: true, email: true, address: true, payment: true });
    const first = order.find((key) => found[key]);
    if (first) {
      document.getElementById(first === 'payment' ? 'pay-momo' : `c-${first}`)?.focus();
      return;
    }

    const customerName = fields.name;
    const customerEmail = fields.email;
    const customerPhone = fields.phone;
    const companyName = fields.company;
    const deliveryAddress = delivery ? fields.address : '';
    const deliveryLandmark = delivery ? fields.landmark : '';
    const requestedDate = fields.date;
    const customerNote = fields.note;

    setSubmitting(true);
    setSubmitError('');
    setPricesRefreshed(false);

    try {
      const orderArtwork = deriveOrderArtwork(customJobs);

      const buildLineItems = () => [
        ...customJobs.map((job) => ({
          type: 'large_format' as const,
          serviceCode: job.estimate.serviceCode,
          width: job.estimate.width,
          height: job.estimate.height,
          unit: job.estimate.unit,
          quantity: job.estimate.quantity,
          estimateId: job.estimate.estimateId,
          fingerprint: job.estimate.fingerprint,
          needsDesign: job.estimate.designFeePesewas > 0 || job.artworkOption === 'design_service',
        })),
        ...items.map((item) => ({
          type: 'product' as const,
          productId: item.product.id,
          quantity: item.qty,
        })),
      ];

      const jobNotes = customJobs
        .map((job) =>
          [
            `${job.estimate.serviceName} (${job.estimate.width}${job.estimate.unit}×${job.estimate.height}${job.estimate.unit}): ${artworkSummary[job.artworkOption]}`,
            job.artworkUrl ? `  file: ${job.artworkUrl}` : '',
            job.artworkLink ? `  link: ${job.artworkLink}` : '',
            job.notes ? `  note: ${job.notes}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
        )
        .join('\n');

      const consolidatedNote = [
        customerNote.trim(),
        companyName ? `Company: ${companyName}` : '',
        `Fulfilment: ${delivery ? `Delivery to ${deliveryAddress} (${deliveryLandmark})` : `Pickup at ${site.address.line1}, ${site.address.line2}`}`,
        requestedDate ? `Deadline: ${requestedDate}` : '',
        jobNotes,
      ]
        .filter(Boolean)
        .join('\n');

      const response = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim().toLowerCase(),
          customerPhone: customerPhone.trim(),
          source: 'online',
          paymentMethod,
          items: buildLineItems(),
          customerNote: consolidatedNote,
          fulfilmentMethod,
          deliveryAddress,
          deliveryLandmark,
          requestedDate,
          ...orderArtwork,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Rates change rarely, so this only fires on that rare event: a rate
        // was republished between the customer viewing a quote and checking
        // out. Re-price every job and show the customer the new totals —
        // never resubmit at a price they haven't seen and agreed to.
        if (/estimate has changed/i.test(data.message || '')) {
          await Promise.all(
            customJobs.map(async (job) => {
              const refreshed = await fetch(`${API_BASE}/estimates/large-format`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  serviceCode: job.estimate.serviceCode,
                  width: job.estimate.width,
                  height: job.estimate.height,
                  unit: job.estimate.unit,
                  quantity: job.estimate.quantity,
                  needsDesign: job.estimate.designFeePesewas > 0,
                }),
              });
              if (!refreshed.ok) return;
              const fresh = await refreshed.json();
              updateCustomJobEstimate(job.id, {
                serviceCode: fresh.serviceCode,
                serviceName: fresh.name || fresh.serviceName,
                width: fresh.width,
                height: fresh.height,
                unit: fresh.unit,
                quantity: fresh.quantity,
                areaPerPieceSqFt: fresh.areaSqFt ?? fresh.areaPerPieceSqFt,
                totalAreaSqFt: fresh.totalAreaSqFt,
                ratePesewasPerSqFt: fresh.ratePesewas ?? fresh.ratePesewasPerSqFt,
                basePesewas: fresh.basePesewas,
                designFeePesewas: fresh.designFeePesewas,
                totalPesewas: fresh.totalPesewas,
                requiresReview: fresh.requiresReview,
                reviewReasons: fresh.reviewReasons || [],
                designMessage: fresh.designMessage,
                estimateId: fresh.estimateId,
                fingerprint: fresh.fingerprint,
              });
            }),
          );
          setPricesRefreshed(true);
          throw new Error('A price changed since you added it. We have updated your total, so check it and place the order again.');
        }

        const message = Array.isArray(data.message) ? data.message.join('. ') : data.message;
        throw new Error(message || 'Your order did not go through. Please try again.');
      }

      const orderNumber = data.orderNumber;
      clear();

      if (data.payment?.authorizationUrl) {
        window.location.assign(data.payment.authorizationUrl);
        return;
      }

      navigate(
        `/confirmation?orderNumber=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(customerEmail.trim().toLowerCase())}&payment=${encodeURIComponent(data.payment?.reference || '')}`,
      );
    } catch (err) {
      setSubmitError(
        err instanceof TypeError
          ? 'We could not reach Vikipat. Check your connection and try again.'
          : err instanceof Error
            ? err.message
            : 'Something went wrong. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isEmpty) {
    return (
      <AppShell title="Checkout" back="/cart">
        <div className="container section">
          <StatusPanel title="Your cart is empty" note="Add a print job or a product before you check out.">
            <Link className="btn btn-primary" to="/print">
              Print something
            </Link>
            <Link className="btn btn-secondary" to="/shop">
              Browse the shop
            </Link>
          </StatusPanel>
        </div>
      </AppShell>
    );
  }

  const cta = submitting ? (
    <>
      <Loader label="Placing your order" />
      Placing your order
    </>
  ) : needsReview ? (
    'Send order for review'
  ) : (
    `Pay ${cedis(total)}`
  );

  const ctaNote = needsReview ? (
    <>You don't pay yet. We confirm the design price with you first.</>
  ) : (
    <>
      <ShieldCheck aria-hidden="true" />
      You finish on Paystack's secure page
    </>
  );

  const summaryList = (
    <ul className="checkout-items">
      {customJobs.map((job) => (
        <li key={job.id}>
          <span>
            <span className="checkout-item-name">{job.estimate.serviceName}</span>
            <span className="checkout-item-meta">
              {job.estimate.width} × {job.estimate.height} {job.estimate.unit}, {job.estimate.quantity}{' '}
              {job.estimate.quantity === 1 ? 'piece' : 'pieces'}
            </span>
          </span>
          <span className="price">{cedisFromPesewas(job.estimate.totalPesewas)}</span>
        </li>
      ))}
      {items.map((item) => (
        <li key={item.product.id}>
          <span>
            <span className="checkout-item-name">{item.product.name}</span>
            <span className="checkout-item-meta">Quantity {item.qty}</span>
          </span>
          <Price value={item.lineTotal} />
        </li>
      ))}
      <li className="checkout-items-total">
        <span>Total</span>
        <Price value={total} />
      </li>
    </ul>
  );

  const payButton = (
    <button type="submit" form="checkout-form" className="co-pay" disabled={submitting}>
      {cta}
    </button>
  );

  // Phones: one slim white row. Desktop: the summary card holds the button.
  const bar = (
    <div className="co-bar">
      <span className="co-bar-figure">
        <Price value={total} className="co-bar-price" />
        <span className="co-bar-note">
          {needsReview ? (
            'You pay after we confirm'
          ) : (
            <>
              <ShieldCheck aria-hidden="true" />
              Secure payment on Paystack
            </>
          )}
        </span>
      </span>
      {payButton}
    </div>
  );

  return (
    <AppShell title="Checkout" back="/cart" bar={bar} barPhoneOnly tabs={false} footer={false}>
      <div className="container checkout">
        <header className="co-head">
          <h1>Checkout</h1>
          <p>Your details, how you get it, then payment.</p>
        </header>

        <div className="checkout-layout">
          <form id="checkout-form" className="checkout-form" onSubmit={handleSubmitOrder} noValidate>
            <details className="checkout-summary-phone">
              <summary>
                <span>
                  {count} {count === 1 ? 'item' : 'items'}
                </span>
                <span className="checkout-summary-total">
                  <Price value={total} />
                  <ChevronDown aria-hidden="true" />
                </span>
              </summary>
              {summaryList}
            </details>

            <fieldset className="checkout-group">
              <legend className="co-title">Your details</legend>
              <div className="form-grid form-grid-2">
                <div className="field">
                  <label className="field-label" htmlFor="c-name">
                    Full name
                  </label>
                  <input
                    id="c-name"
                    className="input"
                    autoComplete="name"
                    value={fields.name}
                    onChange={set('name')}
                    onBlur={blur('name')}
                    {...aria('name')}
                  />
                  <FieldError id="name-error" message={shown('name')} />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="c-phone">
                    Phone number
                  </label>
                  <input
                    id="c-phone"
                    className="input"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="024 000 0000"
                    value={fields.phone}
                    onChange={set('phone')}
                    onBlur={blur('phone')}
                    {...aria('phone')}
                  />
                  {shown('phone') ? (
                    <FieldError id="phone-error" message={shown('phone')} />
                  ) : (
                    <p className="field-hint">We call or WhatsApp you about your order.</p>
                  )}
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="c-email">
                    Email
                  </label>
                  <input
                    id="c-email"
                    className="input"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={fields.email}
                    onChange={set('email')}
                    onBlur={blur('email')}
                    {...aria('email')}
                  />
                  {shown('email') ? (
                    <FieldError id="email-error" message={shown('email')} />
                  ) : (
                    <p className="field-hint">Your receipt and tracking code go here.</p>
                  )}
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="c-company">
                    Company <span className="field-optional">(optional)</span>
                  </label>
                  <input
                    id="c-company"
                    className="input"
                    autoComplete="organization"
                    value={fields.company}
                    onChange={set('company')}
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="checkout-group">
              <legend className="co-title">Pickup or delivery</legend>
              <div className="co-opts">
                <label className="co-opt">
                  <input
                    type="radio"
                    name="fulfilment"
                    checked={fulfilmentMethod === 'pickup'}
                    onChange={() => setFulfilmentMethod('pickup')}
                  />
                  <span className="co-opt-body">
                    <span className="co-opt-title">Pick up at the workshop</span>
                    <span className="co-opt-note">
                      Free. {site.address.line1}, {site.address.line2}.
                    </span>
                  </span>
                  <span className="co-opt-icon" aria-hidden="true">
                    <MapPin />
                  </span>
                  <span className="co-radio" aria-hidden="true" />
                </label>
                <label className="co-opt">
                  <input
                    type="radio"
                    name="fulfilment"
                    checked={fulfilmentMethod === 'delivery'}
                    onChange={() => setFulfilmentMethod('delivery')}
                  />
                  <span className="co-opt-body">
                    <span className="co-opt-title">Deliver to me</span>
                    <span className="co-opt-note">Anywhere in Ghana. We confirm the fee with you before dispatch.</span>
                  </span>
                  <span className="co-opt-icon" aria-hidden="true">
                    <Truck />
                  </span>
                  <span className="co-radio" aria-hidden="true" />
                </label>
              </div>

              {delivery && (
                <div className="form-grid form-grid-2 checkout-delivery">
                  <div className="field">
                    <label className="field-label" htmlFor="c-address">
                      Delivery address or area
                    </label>
                    <input
                      id="c-address"
                      className="input"
                      autoComplete="street-address"
                      placeholder="Spintex Road, Osu, Kasoa"
                      value={fields.address}
                      onChange={set('address')}
                      onBlur={blur('address')}
                      {...aria('address')}
                    />
                    <FieldError id="address-error" message={shown('address')} />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="c-landmark">
                      Landmark or GhanaPost GPS <span className="field-optional">(optional)</span>
                    </label>
                    <input
                      id="c-landmark"
                      className="input"
                      placeholder="GA-183-9022, near the Shell station"
                      value={fields.landmark}
                      onChange={set('landmark')}
                    />
                  </div>
                </div>
              )}

              <div className="form-grid form-grid-2 checkout-extras">
                <div className="field">
                  <label className="field-label" htmlFor="c-date">
                    Need it by <span className="field-optional">(optional)</span>
                  </label>
                  <input id="c-date" className="input" type="date" min={today} value={fields.date} onChange={set('date')} />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="c-note">
                    Notes for our team <span className="field-optional">(optional)</span>
                  </label>
                  <input
                    id="c-note"
                    className="input"
                    placeholder="Eyelets, lamination, gate colour"
                    value={fields.note}
                    onChange={set('note')}
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="checkout-group" aria-describedby={shown('payment') ? 'payment-error' : undefined}>
              <legend className="co-title">Payment</legend>
              <label className="co-opt">
                <input
                  id="pay-momo"
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'mobile_money'}
                  onChange={() => {
                    setPaymentMethod('mobile_money');
                    setTouched((current) => ({ ...current, payment: true }));
                  }}
                />
                <span className="co-opt-body">
                  <span className="co-opt-title">Mobile Money</span>
                  <span className="co-opt-note">
                    {needsReview
                      ? 'MTN, Telecel or AT. You pay once we confirm the design price.'
                      : 'MTN, Telecel or AT. You approve the payment on your phone.'}
                  </span>
                </span>
                <span className="co-opt-icon is-momo" aria-hidden="true">
                  <Smartphone />
                </span>
                <span className="co-radio" aria-hidden="true" />
              </label>
              <FieldError id="payment-error" message={shown('payment')} />
            </fieldset>

            {submitError && (
              <div
                ref={alertRef}
                tabIndex={-1}
                role="alert"
                className={`form-alert${pricesRefreshed ? ' is-warn' : ''}`}
              >
                <AlertCircle aria-hidden="true" />
                <span>{submitError}</span>
              </div>
            )}
          </form>

          <aside className="checkout-aside" aria-label="Order summary">
            <p className="co-aside-kicker">Your order</p>
            {summaryList}
            {payButton}
            <p className="co-aside-note">{ctaNote}</p>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
