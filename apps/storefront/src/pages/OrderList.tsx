import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  Layers,
  MessageCircle,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { Layout, PageHead } from "../components/Layout";
import {
  Crumbs,
  Label,
  Price,
  StockBadge,
  Stepper,
} from "../components/Primitives";
import { buildOrderMessage, useOrder } from "../order";
import { productImage } from "../catalog";
import { deptHref, pad, whatsappLink } from "../lib/format";
import { site } from "../site";
import { useTitle } from "../lib/useReveal";

export default function OrderList() {
  const {
    items,
    customJobs,
    count,
    total,
    stepQty,
    remove,
    removeCustomJob,
    clear,
  } = useOrder();
  const [note, setNote] = useState("");

  useTitle(`Review Order & Jobs | ${site.fullName}`);

  const hasItems = items.length > 0 || customJobs.length > 0;
  const anyLow = items.some((item) => item.product.availability === "low");

  return (
    <Layout>
      <PageHead
        title="Review Quote &amp; Order List"
        lede="Confirm your custom print job specifications, quantities, and physical products before submitting to our Accra production team."
        stats={
          hasItems
            ? [
                {
                  label: "Lines",
                  value: pad(items.length + customJobs.length),
                },
                { label: "Total Units", value: pad(count) },
              ]
            : undefined
        }
      >
        <Crumbs trail={[{ label: "Home", to: "/" }, { label: "Quote List" }]} />
      </PageHead>

      <section className="shell section-tight">
        {!hasItems ? (
          <div className="state">
            <ShoppingBag aria-hidden="true" />
            <h2 className="h3">Your order list is empty</h2>
            <p>
              Configure custom large format banners, stickers, boards, or select
              corporate gifts and apparel from our catalogue.
            </p>
            <div className="state-actions">
              <Link className="btn btn-primary" to="/print">
                Configure Print Job
              </Link>
              <Link className="btn btn-secondary" to="/shop">
                Browse Products
              </Link>
            </div>
          </div>
        ) : (
          <div className="orderlist">
            <div>
              <div className="toolbar">
                <p className="toolbar-count">
                  <strong>{pad(items.length + customJobs.length)}</strong>{" "}
                  lines, <strong>{pad(count)}</strong> total units
                </p>
                <div className="toolbar-end">
                  <button className="btn btn-quiet btn-sm" onClick={clear}>
                    <Trash2
                      aria-hidden="true"
                      style={{ width: 14, height: 14 }}
                    />
                    <span>Clear entire list</span>
                  </button>
                </div>
              </div>

              {/* Custom Configured Large-Format Jobs */}
              {customJobs.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <span
                    className="label-micro"
                    style={{
                      color: "var(--brand-primary)",
                      marginBottom: "8px",
                      display: "block",
                    }}
                  >
                    Custom Print &amp; Large Format Jobs
                  </span>
                  <ul>
                    {customJobs.map((job) => (
                      <li
                        className="orderlist-line"
                        key={job.id}
                        style={{ background: "#f8fafc" }}
                      >
                        <div
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: 12,
                            background: "var(--brand-primary-light)",
                            color: "var(--brand-primary)",
                            display: "grid",
                            placeItems: "center",
                            flex: "none",
                          }}
                        >
                          <Layers
                            aria-hidden="true"
                            style={{ width: 36, height: 36 }}
                          />
                        </div>

                        <div>
                          <h3>{job.estimate.serviceName}</h3>
                          <div className="orderlist-line-meta">
                            <span className="badge badge-featured">
                              Custom Large Format
                            </span>
                            <span>
                              {job.estimate.width} × {job.estimate.height}{" "}
                              {job.estimate.unit} ({job.estimate.totalAreaSqFt}{" "}
                              sq ft)
                            </span>
                            <span>Qty: {job.estimate.quantity}</span>
                          </div>
                          {job.estimate.designFeePesewas > 0 && (
                            <p
                              style={{
                                fontSize: "var(--t-micro)",
                                color: "var(--brand-primary)",
                                fontWeight: 600,
                                marginTop: 4,
                              }}
                            >
                              Includes Graphic Design Fee (+GH₵{" "}
                              {(job.estimate.designFeePesewas / 100).toFixed(2)}
                              )
                            </p>
                          )}
                        </div>

                        <div className="orderlist-line-end">
                          <Price value={job.estimate.totalPesewas / 100} />
                          <button
                            className="drawer-remove"
                            onClick={() => removeCustomJob(job.id)}
                            aria-label="Remove job"
                          >
                            Remove Job
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Physical Products */}
              {items.length > 0 && (
                <div>
                  <span
                    className="label-micro"
                    style={{
                      color: "var(--brand-primary)",
                      marginBottom: "8px",
                      display: "block",
                    }}
                  >
                    Catalogue Products
                  </span>
                  <ul>
                    {items.map(({ product, qty, lineTotal }) => (
                      <li className="orderlist-line" key={product.id}>
                        <img
                          src={productImage(product)}
                          alt={product.name}
                          width={96}
                          height={96}
                          loading="lazy"
                        />

                        <div>
                          <h3>
                            <Link to={`/product/${product.id}`}>
                              {product.name}
                            </Link>
                          </h3>
                          <div className="orderlist-line-meta">
                            <Link
                              className="badge badge-featured"
                              to={deptHref(product.departmentSlug)}
                            >
                              {product.department}
                            </Link>
                            <span className="price-unit">
                              per {product.unit}
                            </span>
                            <StockBadge value={product.availability} />
                          </div>
                        </div>

                        <div className="orderlist-line-end">
                          <Price value={lineTotal} />
                          <Stepper
                            small
                            value={qty}
                            onStep={(delta) => stepQty(product.id, delta)}
                            label={product.name}
                          />
                          <button
                            className="drawer-remove"
                            onClick={() => remove(product.id)}
                            aria-label={`Remove ${product.name} from your list`}
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="field" style={{ marginTop: "var(--s6)" }}>
                <label className="label-micro" htmlFor="note">
                  Project Notes, Sizes, Colors &amp; Delivery Instructions
                </label>
                <textarea
                  id="note"
                  className="textarea"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="e.g. Eyelets every 2ft on banner, delivery to Airport Residential Area, Accra. Need delivery by Friday."
                />
              </div>
            </div>

            <aside className="summary" aria-label="Order summary">
              <Label micro>Estimated Summary</Label>

              <div className="summary-row">
                <span>Unique Lines</span>
                <span className="figure">
                  {pad(items.length + customJobs.length)}
                </span>
              </div>
              <div className="summary-row">
                <span>Total Units</span>
                <span className="figure">{pad(count)}</span>
              </div>
              <div className="summary-row">
                <span>Artwork Pre-Flight</span>
                <span
                  style={{ color: "var(--brand-primary)", fontWeight: 600 }}
                >
                  Free Included
                </span>
              </div>
              <div className="summary-row">
                <span>Delivery</span>
                <span>Calculated on checkout</span>
              </div>

              <div className="summary-total">
                <Label micro>Production Total</Label>
                <Price value={total} />
              </div>

              <Link className="btn btn-primary btn-lg btn-block" to="/checkout">
                <CreditCard aria-hidden="true" />
                <span>Proceed to Checkout &amp; Pay</span>
                <ArrowRight aria-hidden="true" />
              </Link>

              <a
                className="btn btn-whatsapp btn-block"
                href={whatsappLink(
                  buildOrderMessage(items, customJobs, total, note),
                )}
              >
                <MessageCircle aria-hidden="true" />
                <span>Send Order via WhatsApp</span>
              </a>

              <p className="order-note">
                <BadgeCheck aria-hidden="true" />
                No hidden costs. Every file is pre-flight verified by our
                graphics team prior to print execution.
              </p>

              {anyLow && (
                <p
                  className="field-help"
                  style={{ color: "var(--accent-amber-ink)" }}
                >
                  Note: One or more selected items are low in stock. We will
                  confirm availability immediately.
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  marginTop: "12px",
                }}
              >
                <Link
                  className="link"
                  to="/print"
                  style={{ justifyContent: "center" }}
                >
                  <span>+ Add another custom print job</span>
                </Link>
                <Link
                  className="link"
                  to="/shop"
                  style={{ justifyContent: "center" }}
                >
                  <span>+ Add more products from catalogue</span>
                </Link>
              </div>
            </aside>
          </div>
        )}
      </section>
    </Layout>
  );
}
