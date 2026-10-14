import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, FileCheck2, Link2, MessageCircle, Paintbrush, Printer, ShoppingCart, Store, Trash2 } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { AnimatedPrice } from '../components/Motion';
import { Price, Stepper } from '../components/Primitives';
import { useToast } from '../components/Toast';
import { productImage } from '../catalog';
import { buildOrderMessage, CustomPrintJobItem, ResolvedLine, useOrder } from '../order';
import { cedisFromPesewas, perUnit, whatsappLink } from '../lib/format';
import { useTitle } from '../lib/useTitle';
import { site } from '../site';
import '../styles/pages/cart.css';

const artworkLine: Record<CustomPrintJobItem['artworkOption'], { text: string; icon: typeof FileCheck2 }> = {
  upload: { text: 'File attached', icon: FileCheck2 },
  link: { text: 'Link shared', icon: Link2 },
  design_service: { text: 'Our designers will make it', icon: Paintbrush },
  later: { text: 'You will send it on WhatsApp', icon: Clock },
};

export default function Cart() {
  useTitle(`Your cart | ${site.fullName}`);
  const { items, customJobs, count, total, stepQty, setQty, remove, removeCustomJob, add, addCustomJob } = useOrder();
  const { show } = useToast();
  const [note, setNote] = useState('');

  const hasItems = items.length > 0 || customJobs.length > 0;
  const needsReview = customJobs.some((job) => job.estimate.requiresReview || job.artworkOption === 'design_service');

  const removeLine = (line: ResolvedLine) => {
    remove(line.product.id);
    show(`${line.product.name} removed`, { label: 'Undo', onClick: () => add(line.product, line.qty) });
  };

  const removeJob = (job: CustomPrintJobItem) => {
    removeCustomJob(job.id);
    const { id: _id, ...rest } = job;
    show(`${job.estimate.serviceName} removed`, { label: 'Undo', onClick: () => addCustomJob(rest) });
  };

  if (!hasItems) {
    return (
      <AppShell>
        <div className="container cart cart-empty">
          <span className="cart-empty-mark" aria-hidden="true">
            <ShoppingCart />
          </span>
          <h1>Your cart is empty</h1>
          <p>Start a print job, or pick something ready-made from the shop.</p>

          <div className="cart-empty-options">
            <Link className="cart-empty-opt" to="/print">
              <span className="cart-empty-icon" aria-hidden="true">
                <Printer />
              </span>
              <span className="cart-empty-body">
                <b>Print something</b>
                <span>Banners, stickers, backdrops. See the price as you go.</span>
              </span>
              <ArrowRight className="cart-empty-arrow" aria-hidden="true" />
            </Link>
            <Link className="cart-empty-opt" to="/shop">
              <span className="cart-empty-icon is-shop" aria-hidden="true">
                <Store />
              </span>
              <span className="cart-empty-body">
                <b>Browse the shop</b>
                <span>Shirts, mugs, labels and more, ready to order.</span>
              </span>
              <ArrowRight className="cart-empty-arrow" aria-hidden="true" />
            </Link>
          </div>

          <a className="cart-empty-wa" href={whatsappLink(`Hello ${site.name}, I need help with an order.`)} target="_blank" rel="noreferrer">
            <MessageCircle className="wa" aria-hidden="true" />
            Not sure what you need? Ask us on WhatsApp
          </a>
        </div>
      </AppShell>
    );
  }

  const bar = (
    <div className="cart-bar">
      <span className="cart-bar-figure" aria-live="polite">
        <AnimatedPrice value={total} className="price cart-bar-price" />
        <span className="cart-bar-note">
          {count} {count === 1 ? 'item' : 'items'}
        </span>
      </span>
      <Link className="cart-cta" to="/checkout">
        Checkout
        <ArrowRight aria-hidden="true" />
      </Link>
    </div>
  );

  return (
    <AppShell title="Your cart" back="/" bar={bar} barPhoneOnly tabs={false} footer={false}>
      <div className="container cart">
        <header className="cart-head">
          <h1>Your cart</h1>
          <p>
            {count} {count === 1 ? 'item' : 'items'}. Check the details, then go to checkout.
          </p>
        </header>

        <div className="cart-layout">
          <ul className="cart-lines" aria-label="Items in your cart">
            {customJobs.map((job) => {
              const artwork = artworkLine[job.artworkOption];
              const ArtIcon = artwork.icon;
              const { estimate } = job;
              return (
                <li className="cart-line" key={job.id}>
                  <div className="cart-line-main">
                    <span className="cart-line-icon" aria-hidden="true">
                      <Printer />
                    </span>
                    <div className="cart-line-body">
                      <span className="cart-line-kicker">Print job</span>
                      <span className="cart-line-name">{estimate.serviceName}</span>
                      <ul className="cart-chips" aria-label="Job details">
                        <li>
                          {estimate.width} × {estimate.height} {estimate.unit}
                        </li>
                        <li>
                          {estimate.quantity} {estimate.quantity === 1 ? 'piece' : 'pieces'}
                        </li>
                        <li>{estimate.totalAreaSqFt} sq ft</li>
                      </ul>
                    </div>
                  </div>
                  <div className="cart-line-art">
                    <ArtIcon aria-hidden="true" />
                    <span>
                      <b>Artwork:</b> {artwork.text}
                      {job.artworkName ? ` (${job.artworkName})` : ''}
                    </span>
                  </div>
                  <div className="cart-line-foot">
                    <button type="button" className="cart-remove" onClick={() => removeJob(job)}>
                      <Trash2 aria-hidden="true" />
                      Remove
                      <span className="visually-hidden"> {estimate.serviceName}</span>
                    </button>
                    <span className="cart-line-price">
                      {estimate.designFeePesewas > 0 && (
                        <small>Includes design from {cedisFromPesewas(estimate.designFeePesewas)}</small>
                      )}
                      <span className="price cart-line-total">{cedisFromPesewas(estimate.totalPesewas)}</span>
                    </span>
                  </div>
                </li>
              );
            })}

            {items.map((line) => (
              <li className="cart-line" key={line.product.id}>
                <div className="cart-line-main">
                  <Link className="cart-line-thumb" to={`/product/${line.product.id}`} tabIndex={-1} aria-hidden="true">
                    <img src={productImage(line.product)} alt="" width={64} height={64} loading="lazy" />
                  </Link>
                  <div className="cart-line-body">
                    <span className="cart-line-kicker">{line.product.department}</span>
                    <Link className="cart-line-name" to={`/product/${line.product.id}`}>
                      {line.product.name}
                    </Link>
                    <span className="cart-line-unit">
                      <Price value={line.product.price} /> {perUnit(line.product.unit)}
                    </span>
                  </div>
                </div>
                <div className="cart-line-foot">
                  <Stepper
                    small
                    value={line.qty}
                    max={Math.max(1, Math.min(999, line.product.stockCount))}
                    label={line.product.name}
                    onStep={(delta) => {
                      if (delta < 0 && line.qty === 1) return;
                      stepQty(line.product.id, delta);
                    }}
                    onSet={(value) => setQty(line.product.id, Math.min(value, Math.max(1, line.product.stockCount)))}
                  />
                  <span className="cart-line-price">
                    <Price value={line.lineTotal} className="cart-line-total" />
                  </span>
                </div>
                <button type="button" className="cart-remove cart-remove-corner" onClick={() => removeLine(line)}>
                  <Trash2 aria-hidden="true" />
                  <span className="visually-hidden">Remove {line.product.name}</span>
                </button>
              </li>
            ))}
          </ul>

          <aside className="cart-summary" aria-label="Order summary">
            <p className="cart-summary-kicker">Order summary</p>
            <dl className="cart-totals">
              <div>
                <dt>Items</dt>
                <dd className="num">{count}</dd>
              </div>
              <div>
                <dt>Delivery</dt>
                <dd>Free pickup, or confirmed before dispatch</dd>
              </div>
            </dl>
            <div className="cart-total">
              <span>Total</span>
              <Price value={total} />
            </div>
            {needsReview && <p className="cart-review-note">We confirm design prices with you before you pay.</p>}
            <Link className="cart-cta cart-summary-checkout" to="/checkout">
              Checkout
              <ArrowRight aria-hidden="true" />
            </Link>

            <details className="cart-whatsapp">
              <summary>
                <MessageCircle className="wa" aria-hidden="true" />
                Prefer to order on WhatsApp?
              </summary>
              <div className="cart-whatsapp-body">
                <div className="field">
                  <label className="field-label" htmlFor="cart-note">
                    Anything to add? <span className="field-optional">(optional)</span>
                  </label>
                  <textarea
                    id="cart-note"
                    className="textarea"
                    placeholder="Deadline, delivery area, colours"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </div>
                <a
                  className="cart-wa-btn"
                  href={whatsappLink(buildOrderMessage(items, customJobs, total, note))}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="wa" aria-hidden="true" />
                  Send this order on WhatsApp
                </a>
              </div>
            </details>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
