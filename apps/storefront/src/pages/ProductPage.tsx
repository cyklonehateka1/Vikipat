import { useEffect, useState } from 'react';
import { Link, useParams, useViewTransitionState } from 'react-router-dom';
import { MapPin, MessageCircle, Plus, Smartphone } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { AnimatedPrice, useBurst } from '../components/Motion';
import { Price, Stepper, StockNote } from '../components/Primitives';
import { CatalogError, ProductGrid, StatusPanel } from '../components/ProductGrid';
import { useToast } from '../components/Toast';
import { productImage, relatedTo, useCatalog } from '../catalog';
import { buildSingleMessage, useOrder } from '../order';
import { deptHref, perUnit, quantityOf, whatsappLink } from '../lib/format';
import { useTitle } from '../lib/useTitle';
import { site } from '../site';
import '../styles/pages/shop.css';

export default function ProductPage() {
  const { id } = useParams();
  const { products, loading, error, retry } = useCatalog();
  const { add, qtyOf } = useOrder();
  const { show } = useToast();
  const burst = useBurst();
  const [qty, setQty] = useState(1);
  const opening = useViewTransitionState(`/product/${id}`);

  const product = products.find((item) => item.id === id);
  useTitle(product ? `${product.name} | ${site.fullName}` : `Product | ${site.fullName}`);

  useEffect(() => setQty(1), [id]);

  if (loading) {
    return (
      <AppShell title="Loading" back="/shop" tabs={false}>
        <div className="container product-skeleton" aria-busy="true" aria-label="Loading product">
          <div className="skeleton skeleton-media" />
          <div className="skeleton" style={{ height: 28, width: '70%' }} />
          <div className="skeleton" style={{ height: 22, width: '40%' }} />
          <div className="skeleton" style={{ height: 64 }} />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Product" back="/shop">
        <div className="container section">
          <CatalogError onRetry={retry} />
        </div>
      </AppShell>
    );
  }

  if (!product) {
    return (
      <AppShell title="Product" back="/shop">
        <div className="container section">
          <StatusPanel title="This product is no longer listed" note="It may have sold out for good or been renamed.">
            <Link className="btn btn-primary" to="/shop">
              Browse the shop
            </Link>
          </StatusPanel>
        </div>
      </AppShell>
    );
  }

  const soldOut = product.availability === 'out';
  const maxQty = Math.max(1, Math.min(999, product.stockCount));
  const total = product.price * qty;
  const inCart = qtyOf(product.id);
  const related = relatedTo(products, product);
  const askLink = whatsappLink(`Hello ${site.name}, I have a question about ${product.name} (ref ${product.ref}).`);

  const addToCart = () => {
    burst.fire();
    add(product, qty);
    show(`${quantityOf(product.unit, qty)} added to your cart`, { label: 'View cart', to: '/cart' });
  };

  const buyNote = inCart ? `${inCart} already in your cart` : quantityOf(product.unit, qty);

  const bar = soldOut ? (
    <>
      <span className="action-bar-figure">
        <span className="stock-note is-out">Sold out</span>
        <span className="action-bar-note">Ask us when it will be back</span>
      </span>
      <a className="btn btn-primary btn-lg" href={askLink} target="_blank" rel="noreferrer">
        <MessageCircle aria-hidden="true" />
        Ask on WhatsApp
      </a>
    </>
  ) : (
    <>
      <span className="action-bar-figure" aria-live="polite">
        <AnimatedPrice value={total} className="price-big" />
        <span className="action-bar-note">{buyNote}</span>
      </span>
      <button type="button" className="btn btn-primary btn-lg" onClick={addToCart}>
        <Plus aria-hidden="true" />
        Add to cart
        {burst.node}
      </button>
    </>
  );

  return (
    <AppShell title={product.name} back={deptHref(product.departmentSlug)} bar={bar} barPhoneOnly>
      <article className="container product">
        <div className="product-media">
          <img
            src={productImage(product)}
            alt={product.name}
            width={900}
            height={900}
            style={opening ? { viewTransitionName: 'product-image' } : undefined}
          />
        </div>

        <div className="product-info">
          <Link className="product-dept" to={deptHref(product.departmentSlug)}>
            {product.department}
          </Link>
          <h1 className="title product-title">{product.name}</h1>
          <div className="product-price-row">
            <span>
              <Price value={product.price} /> <span className="price-unit">{perUnit(product.unit)}</span>
            </span>
            <StockNote product={product} />
          </div>
          {product.description && <p className="product-desc">{product.description}</p>}

          {!soldOut && (
            <div className="product-qty">
              <span className="product-qty-label" id="qty-label">
                Quantity
              </span>
              <Stepper
                value={qty}
                max={maxQty}
                label={product.name}
                onStep={(delta) => setQty((current) => Math.min(maxQty, Math.max(1, current + delta)))}
                onSet={(value) => setQty(Math.min(maxQty, value))}
              />
            </div>
          )}

          <div className="product-buy">
            {soldOut ? (
              <a className="btn btn-primary btn-lg btn-block" href={askLink} target="_blank" rel="noreferrer">
                <MessageCircle aria-hidden="true" />
                Ask when it will be back
              </a>
            ) : (
              <>
                <div className="product-buy-total">
                  <span className="action-bar-note">{buyNote}</span>
                  <AnimatedPrice value={total} className="price-big" />
                </div>
                <button type="button" className="btn btn-primary btn-lg btn-block" onClick={addToCart}>
                  <Plus aria-hidden="true" />
                  Add to cart
                </button>
              </>
            )}
          </div>

          <ul className="facts">
            <li>
              <MessageCircle aria-hidden="true" />
              <span>Send your logo or artwork on WhatsApp after you order. We show you a proof before we print.</span>
            </li>
            <li>
              <MapPin aria-hidden="true" />
              <span>
                Free pickup at {site.address.line1}, or delivery anywhere in Ghana. We confirm the delivery fee with you
                first.
              </span>
            </li>
            <li>
              <Smartphone aria-hidden="true" />
              <span>Pay with {site.payment}.</span>
            </li>
          </ul>

          <a className="text-link" href={whatsappLink(buildSingleMessage(product, qty))} target="_blank" rel="noreferrer">
            <MessageCircle className="wa" aria-hidden="true" />
            Order this on WhatsApp instead
          </a>
        </div>
      </article>

      {related.length > 0 && (
        <section className="container product-related" aria-labelledby="related-title">
          <div className="section-head">
            <h2 className="title" id="related-title">
              More in {product.department}
            </h2>
            <Link className="text-link" to={deptHref(product.departmentSlug)}>
              See all
            </Link>
          </div>
          <ProductGrid products={related} empty={null} skeletons={4} variant="feature" />
        </section>
      )}
    </AppShell>
  );
}
