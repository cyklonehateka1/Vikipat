import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Layers,
  MessageCircle,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { buildOrderMessage, useOrder } from "../order";
import { productImage } from "../catalog";
import { whatsappLink } from "../lib/format";
import { useOverlay } from "../lib/useOverlay";
import { Price, Stepper } from "./Primitives";

/** The upgraded order list as a sleek slide-over drawer with custom job support. */
export function OrderDrawer() {
  const {
    items,
    customJobs,
    count,
    total,
    closeDrawer,
    stepQty,
    remove,
    removeCustomJob,
  } = useOrder();
  const { panelRef, closeRef } = useOverlay(closeDrawer);
  const [note, setNote] = useState("");

  const hasItems = items.length > 0 || customJobs.length > 0;

  return (
    <>
      <button
        className="scrim"
        onClick={closeDrawer}
        tabIndex={-1}
        aria-hidden="true"
      />
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Your quote and order list"
        ref={panelRef}
      >
        <div className="sheet-top">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShoppingBag
              aria-hidden="true"
              style={{ width: 20, height: 20, color: "var(--brand-primary)" }}
            />
            <h2 className="h3" style={{ fontSize: "1.15rem" }}>
              Your Order &amp; Jobs ({count})
            </h2>
          </div>
          <button
            ref={closeRef}
            className="icon-btn"
            onClick={closeDrawer}
            aria-label="Close order drawer"
          >
            <X />
          </button>
        </div>

        {hasItems && (
          <div
            style={{
              padding: "10px 18px",
              background: "var(--brand-primary-light)",
              borderBottom: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "var(--t-micro)",
              color: "var(--brand-primary-deep)",
              fontWeight: 600,
            }}
          >
            <CheckCircle2
              aria-hidden="true"
              style={{ width: 14, height: 14, color: "var(--brand-primary)" }}
            />
            <span>
              Free artwork pre-flight check &amp; Paystack payment enabled
            </span>
          </div>
        )}

        <div className="sheet-body">
          {!hasItems ? (
            <div className="drawer-empty">
              <ShoppingBag aria-hidden="true" />
              <p className="h3">Your order list is empty</p>
              <p>
                Configure a custom large-format print job or select products
                from our catalogue.
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  marginTop: "16px",
                  width: "100%",
                }}
              >
                <Link
                  className="btn btn-primary"
                  to="/print"
                  onClick={closeDrawer}
                >
                  Configure Print Job
                </Link>
                <Link
                  className="btn btn-secondary"
                  to="/shop"
                  onClick={closeDrawer}
                >
                  Explore Products
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Custom Configured Large-Format Jobs */}
              {customJobs.map((job) => (
                <div
                  className="drawer-line"
                  key={job.id}
                  style={{
                    background: "#f8fafc",
                    padding: "14px",
                    borderRadius: "12px",
                    margin: "12px 16px",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: "var(--brand-primary-light)",
                      color: "var(--brand-primary)",
                      display: "grid",
                      placeItems: "center",
                      flex: "none",
                    }}
                  >
                    <Layers
                      aria-hidden="true"
                      style={{ width: 22, height: 22 }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="drawer-line-name" style={{ fontWeight: 700 }}>
                      {job.estimate.serviceName}
                    </p>
                    <p className="drawer-line-meta">
                      {job.estimate.width} × {job.estimate.height}{" "}
                      {job.estimate.unit} ({job.estimate.totalAreaSqFt} sq ft) ·
                      Qty {job.estimate.quantity}
                    </p>
                    {job.estimate.designFeePesewas > 0 && (
                      <p
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--brand-primary)",
                          fontWeight: 600,
                          marginTop: 2,
                        }}
                      >
                        + Design Service (GH₵{" "}
                        {(job.estimate.designFeePesewas / 100).toFixed(2)})
                      </p>
                    )}
                    <div className="drawer-line-foot" style={{ marginTop: 8 }}>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--ink-subtle)",
                        }}
                      >
                        GH₵ {(job.estimate.ratePesewasPerSqFt / 100).toFixed(2)}
                        /sq ft
                      </span>
                      <Price value={job.estimate.totalPesewas / 100} />
                    </div>
                    <button
                      className="drawer-remove"
                      onClick={() => removeCustomJob(job.id)}
                      aria-label="Remove job"
                      style={{ marginTop: 6 }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              {/* Physical Products */}
              {items.map(({ product, qty, lineTotal }) => (
                <div className="drawer-line" key={product.id}>
                  <img
                    src={productImage(product)}
                    alt={product.name}
                    width={74}
                    height={74}
                    loading="lazy"
                  />
                  <div>
                    <p className="drawer-line-name">
                      <Link to={`/product/${product.id}`} onClick={closeDrawer}>
                        {product.name}
                      </Link>
                    </p>
                    <p className="drawer-line-meta">
                      {product.department} · {product.unit}
                    </p>
                    <div className="drawer-line-foot">
                      <Stepper
                        small
                        value={qty}
                        onStep={(delta) => stepQty(product.id, delta)}
                        label={product.name}
                      />
                      <Price value={lineTotal} />
                    </div>
                    <button
                      className="drawer-remove"
                      onClick={() => remove(product.id)}
                      aria-label={`Remove ${product.name} from your list`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <div style={{ padding: "16px 20px 0" }}>
                <label
                  htmlFor="drawer-note"
                  className="label-micro"
                  style={{ display: "block", marginBottom: "6px" }}
                >
                  Project notes or custom requests (optional)
                </label>
                <textarea
                  id="drawer-note"
                  className="textarea"
                  style={{ minHeight: "68px", fontSize: "var(--t-small)" }}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Grommets every 2 feet, matte finish, deliver to Airport..."
                />
              </div>
            </>
          )}
        </div>

        {hasItems && (
          <div className="sheet-foot">
            <div className="drawer-total">
              <div>
                <span className="label-micro" style={{ display: "block" }}>
                  Authoritative Total
                </span>
                <span
                  style={{ fontSize: "0.75rem", color: "var(--ink-subtle)" }}
                >
                  Real-time production calculation
                </span>
              </div>
              <Price value={total} />
            </div>

            <Link
              className="btn btn-primary btn-block btn-lg"
              to="/checkout"
              onClick={closeDrawer}
            >
              <CreditCard aria-hidden="true" />
              <span>Checkout &amp; Order Now</span>
              <ArrowRight aria-hidden="true" />
            </Link>

            <a
              className="btn btn-whatsapp btn-block"
              href={whatsappLink(
                buildOrderMessage(items, customJobs, total, note),
              )}
            >
              <MessageCircle aria-hidden="true" />
              <span>Send Order on WhatsApp</span>
            </a>

            <Link
              className="btn btn-secondary btn-block"
              to="/list"
              onClick={closeDrawer}
            >
              <span>Review Detailed Order List</span>
            </Link>

            <p
              style={{
                textAlign: "center",
                fontSize: "0.75rem",
                color: "var(--ink-subtle)",
                lineHeight: 1.4,
              }}
            >
              Zero risk. We verify artwork and schedule delivery with you prior
              to billing.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
