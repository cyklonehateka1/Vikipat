import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Clock,
  FileCheck,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { ProductCard } from '../components/ProductCard';
import { Crumbs, Label, Price, SectionHead, StockBadge, Stepper } from '../components/Primitives';
import { availabilityLabel, productImage, relatedTo, useCatalog } from '../catalog';
import { buildSingleMessage, useOrder } from '../order';
import { deptHref, money, telLink, whatsappLink } from '../lib/format';
import { site } from '../site';
import { useReveal, useTitle } from '../lib/useReveal';
import NotFound from './NotFound';

export default function ProductPage() {
  const { id } = useParams();
  const { products, loading, error, retry } = useCatalog();
  const { add, qtyOf, openDrawer } = useOrder();
  const [qty, setQty] = useState(1);

  const product = products.find((item) => item.id === id);
  const inList = product ? qtyOf(product.id) : 0;

  useEffect(() => {
    setQty(1);
  }, [id]);

  useTitle(product ? `${product.name} | ${site.fullName}` : `Product | ${site.fullName}`);
  useReveal([id, products.length]);

  if (loading) {
    return (
      <Layout>
        <div className="shell section">
          <div className="state">
            <span className="loader" />
            <h1 className="h3">Loading product details...</h1>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="shell section">
          <div className="state">
            <h1 className="h3">We could not load this product listing</h1>
            <p>{error}</p>
            <div className="state-actions">
              <button className="btn btn-primary" onClick={retry}>
                <RefreshCw aria-hidden="true" /> Try again
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) return <NotFound reason="That product line is not in the active catalogue." />;

  const related = relatedTo(products, product);
  const soldOut = product.availability === 'out';
  const subtotal = product.price * qty;

  return (
    <Layout>
      <section className="shell section-tight">
        <Crumbs
          trail={[
            { label: 'Home', to: '/' },
            { label: 'All Products', to: '/shop' },
            { label: product.department, to: deptHref(product.departmentSlug) },
            { label: product.name },
          ]}
        />

        <article className="detail">
          {/* Left Column: Product Imagery */}
          <div className="detail-media">
            <figure className="detail-figure">
              <img src={productImage(product)} alt={product.name} width={900} height={900} />
              {product.featured && !soldOut && (
                <div className="card-flags">
                  <span className="badge badge-featured">Featured Product</span>
                </div>
              )}
            </figure>
          </div>

          {/* Right Column: Information & Actions */}
          <div className="detail-body">
            <div>
              <div className="detail-eyebrow">
                <Link className="badge badge-featured" to={deptHref(product.departmentSlug)}>
                  {product.department}
                </Link>
                <span className="label-micro" style={{ color: 'var(--ink-subtle)' }}>Ref {product.ref}</span>
              </div>
              <h1 className="h1 detail-title">{product.name}</h1>
            </div>

            <div className="price-row">
              <Price value={product.price} large />
              <span className="price-unit">per {product.unit}</span>
              <span className="push">
                <StockBadge value={product.availability} />
              </span>
            </div>

            {product.description && <p className="prose">{product.description}</p>}

            {/* The Order & Quote Panel */}
            <div className="order-panel">
              {soldOut ? (
                <>
                  <Label micro>Currently Out of Stock</Label>
                  <p className="prose" style={{ fontSize: 'var(--t-small)' }}>
                    This item is currently awaiting materials replenishment. Message our counter and we will notify you when it is available or offer an immediate alternative.
                  </p>
                  <a
                    className="btn btn-whatsapp btn-block"
                    href={whatsappLink(
                      `Hello ${site.name}, is ${product.name} (Ref ${product.ref}) available for custom production?`,
                    )}
                  >
                    <MessageCircle aria-hidden="true" /> Inquire Availability
                  </a>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Label micro>Configure Quantity</Label>
                    <span style={{ fontSize: 'var(--t-micro)', color: 'var(--ink-subtle)' }}>
                      Bulk discounts apply for 20+ units
                    </span>
                  </div>

                  <div className="order-row">
                    <Stepper
                      value={qty}
                      onStep={(delta) =>
                        setQty((current) => Math.min(999, Math.max(1, current + delta)))
                      }
                      label={product.name}
                    />
                    <button
                      className={`btn ${inList ? 'card-added' : 'btn-primary'}`}
                      onClick={() => (inList ? openDrawer() : add(product, qty))}
                    >
                      {inList ? (
                        <>
                          <Check aria-hidden="true" /> In your quote list ({inList})
                        </>
                      ) : (
                        <>
                          <Plus aria-hidden="true" /> Add {qty} to Quote List
                        </>
                      )}
                    </button>
                  </div>

                  <div className="order-subtotal">
                    <Label micro>
                      Subtotal ({qty} × {product.unit})
                    </Label>
                    <Price value={subtotal} />
                  </div>

                  <a
                    className="btn btn-whatsapp btn-block"
                    href={whatsappLink(buildSingleMessage(product, qty))}
                  >
                    <MessageCircle aria-hidden="true" /> Order / Quote Directly on WhatsApp
                  </a>

                  <p className="order-note">
                    <BadgeCheck aria-hidden="true" />
                    Nothing is charged online. We verify your artwork, confirm {money(subtotal)} and the delivery schedule with you before invoicing.
                  </p>
                </>
              )}
            </div>

            {/* Artwork Guidelines Card */}
            <div style={{ padding: '16px 20px', background: 'var(--surface-2)', borderRadius: 'var(--r-lg)', border: '1px solid var(--line)', display: 'grid', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                <FileCheck aria-hidden="true" style={{ width: 18, height: 18 }} />
                <span>Artwork &amp; File Preparation</span>
              </div>
              <p style={{ fontSize: 'var(--t-small)', color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                Send your print-ready files (PDF, AI, EPS, or 300 DPI PNG) via WhatsApp or email. If you need design adjustments or a full custom layout, our in-house graphics team provides full assistance.
              </p>
            </div>

            {/* Delivery & Studio Facts */}
            <ul className="facts">
              <li>
                <Truck aria-hidden="true" />
                <span>
                  <strong>Nationwide Dispatch Across Ghana.</strong> Direct courier delivery to your office, shop or home.
                </span>
              </li>
              <li>
                <Clock aria-hidden="true" />
                <span>
                  <strong>Fast Production Turnaround.</strong> Most standard print orders are completed in 1 to 3 business days.
                </span>
              </li>
              <li>
                <MapPin aria-hidden="true" />
                <span>
                  <strong>Pickup Available in East Legon, Ogbojo.</strong> Collect your finished order directly from our studio counter.
                </span>
              </li>
              <li>
                <ShieldCheck aria-hidden="true" />
                <span>
                  <strong>Payment Options:</strong> {site.payment}. Details are provided upon proof approval.
                </span>
              </li>
            </ul>

            {/* Specifications Table */}
            <div className="stack">
              <Label micro>Product Specifications</Label>
              <table className="spec">
                <tbody>
                  <tr>
                    <th scope="row">Item Unit</th>
                    <td>{product.unit}</td>
                  </tr>
                  <tr>
                    <th scope="row">Category</th>
                    <td>{product.department}</td>
                  </tr>
                  <tr>
                    <th scope="row">Reference Code</th>
                    <td>{product.ref}</td>
                  </tr>
                  <tr>
                    <th scope="row">Stock Status</th>
                    <td>{availabilityLabel[product.availability]}</td>
                  </tr>
                  <tr>
                    <th scope="row">Standard Finish</th>
                    <td>Premium Commercial Grade</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="row row-wrap">
              <a className="link" href={telLink}>
                <Phone aria-hidden="true" /> Call Counter: {site.phoneDisplay}
              </a>
            </div>
          </div>
        </article>
      </section>

      {/* Sticky Mobile Action Bar */}
      {!soldOut && (
        <div className="order-bar">
          <div>
            <Price value={product.price} />
            <span className="price-unit" style={{ display: 'block' }}>
              per {product.unit}
            </span>
          </div>
          <button
            className={`btn ${inList ? 'card-added' : 'btn-primary'}`}
            onClick={() => (inList ? openDrawer() : add(product, qty))}
          >
            {inList ? (
              <>
                <Check aria-hidden="true" /> In list ({inList})
              </>
            ) : (
              <>
                <Plus aria-hidden="true" /> Add to Quote List
              </>
            )}
          </button>
        </div>
      )}

      {/* Related Category Items */}
      {related.length > 0 && (
        <section className="shell section-tight">
          <SectionHead
            eyebrow="Related Products"
            title={`More in ${product.department}`}
            action={
              <Link className="link" to={deptHref(product.departmentSlug)}>
                View category <ArrowRight aria-hidden="true" />
              </Link>
            }
          />
          <div className="grid grid-products">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </Layout>
  );
}
