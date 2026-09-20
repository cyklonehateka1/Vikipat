import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CreditCard,
  FileCheck,
  HelpCircle,
  Link as LinkIcon,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Smartphone,
  Truck,
} from "lucide-react";
import { Layout } from "../components/Layout";
import { useOrder } from "../order";
import { site } from "../site";
import { useTitle } from "../lib/useReveal";
import { API_BASE } from "../lib/api";
import "../styles/checkout.css";

/** One order-level artwork submission is derived from the per-job choices
 * made in the configurator: design service wins (it needs studio review
 * regardless of what else was attached), then an actual uploaded file,
 * then a shared link, and "later" only if nothing else was given. */
function deriveOrderArtwork(customJobs: ReturnType<typeof useOrder>["customJobs"]) {
  const designJob = customJobs.find((j) => j.artworkOption === "design_service");
  if (designJob) return { artworkOption: "design_service" as const, artworkUrl: "", artworkName: "", artworkLink: "" };
  const uploadJob = customJobs.find((j) => j.artworkOption === "upload" && j.artworkUrl);
  if (uploadJob) {
    return {
      artworkOption: "upload" as const,
      artworkUrl: uploadJob.artworkUrl || "",
      artworkName: uploadJob.artworkName || "",
      artworkLink: "",
    };
  }
  const linkJob = customJobs.find((j) => j.artworkOption === "link" && j.artworkLink);
  if (linkJob) return { artworkOption: "link" as const, artworkUrl: "", artworkName: "", artworkLink: linkJob.artworkLink || "" };
  return { artworkOption: "later" as const, artworkUrl: "", artworkName: "", artworkLink: "" };
}

const artworkSummary: Record<string, string> = {
  upload: "File uploaded",
  link: "Shared via cloud link",
  design_service: "Vikipat studio will design this",
  later: "Will be sent later via WhatsApp",
};

export default function Checkout() {
  useTitle(`Checkout & Complete Order | ${site.fullName}`);
  const navigate = useNavigate();
  const { items, customJobs, total, totalPesewas, count, clear, updateCustomJobEstimate } = useOrder();

  // Customer Contact State
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [companyName, setCompanyName] = useState("");

  // Fulfilment State
  const [fulfilmentMethod, setFulfilmentMethod] = useState<
    "pickup" | "delivery"
  >("delivery");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLandmark, setDeliveryLandmark] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [customerNote, setCustomerNote] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<"mobile_money" | "">("");

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [pricesRefreshed, setPricesRefreshed] = useState(false);

  const isEmpty = items.length === 0 && customJobs.length === 0;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerEmail.trim()) {
      setSubmitError("Please provide your name and email address.");
      return;
    }

    if (paymentMethod !== "mobile_money") {
      setSubmitError("Please select Mobile Money to continue.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setPricesRefreshed(false);

    try {
      const orderArtwork = deriveOrderArtwork(customJobs);

      const buildLineItems = () => [
        ...customJobs.map((job) => ({
          type: "large_format" as const,
          serviceCode: job.estimate.serviceCode,
          width: job.estimate.width,
          height: job.estimate.height,
          unit: job.estimate.unit,
          quantity: job.estimate.quantity,
          estimateId: job.estimate.estimateId,
          fingerprint: job.estimate.fingerprint,
          needsDesign:
            job.estimate.designFeePesewas > 0 ||
            job.artworkOption === "design_service",
        })),
        ...items.map((item) => ({
          type: "product" as const,
          productId: item.product.id,
          quantity: item.qty,
        })),
      ];

      const jobNotes = customJobs
        .map((job) =>
          [
            `${job.estimate.serviceName} (${job.estimate.width}${job.estimate.unit}×${job.estimate.height}${job.estimate.unit}): ${artworkSummary[job.artworkOption]}`,
            job.artworkUrl ? `  file: ${job.artworkUrl}` : "",
            job.artworkLink ? `  link: ${job.artworkLink}` : "",
            job.notes ? `  note: ${job.notes}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        )
        .join("\n");

      const consolidatedNote = [
        customerNote.trim(),
        companyName ? `Company: ${companyName}` : "",
        `Fulfilment: ${fulfilmentMethod === "delivery" ? `Delivery to ${deliveryAddress} (${deliveryLandmark})` : `Pickup at ${site.address.line1}, ${site.address.line2}`}`,
        requestedDate ? `Deadline: ${requestedDate}` : "",
        jobNotes,
      ]
        .filter(Boolean)
        .join("\n");

      const response = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim().toLowerCase(),
          customerPhone: customerPhone.trim(),
          source: "online",
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
      const data = await response.json();

      if (!response.ok) {
        // Rates change rarely, so this only fires on that rare event: a rate
        // was republished between the customer viewing a quote and checking
        // out. Re-price every job and show the customer the new totals —
        // never resubmit at a price they haven't seen and agreed to.
        if (/estimate has changed/i.test(data.message || "")) {
          await Promise.all(
            customJobs.map(async (job) => {
              const refreshed = await fetch(`${API_BASE}/estimates/large-format`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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
          throw new Error(
            "Prices changed since you last checked out. We've refreshed them below, please review the new total and submit again.",
          );
        }

        throw new Error(
          data.message || "Could not submit your order. Please try again.",
        );
      }

      // Order created successfully!
      const orderNumber = data.orderNumber;
      clear(); // Empty cart

      if (data.payment?.authorizationUrl) {
        window.location.assign(data.payment.authorizationUrl);
        return;
      }

      navigate(
        `/confirmation?orderNumber=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(customerEmail.trim().toLowerCase())}&payment=${encodeURIComponent(data.payment?.reference || "")}`,
      );
    } catch (err: any) {
      setSubmitError(
        err.message || "An unexpected error occurred during submission.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isEmpty) {
    return (
      <Layout>
        <div className="checkout-shell">
          <div className="confirmation-hero">
            <Package
              aria-hidden="true"
              style={{
                width: 48,
                height: 48,
                color: "var(--brand-primary)",
                margin: "0 auto 16px",
              }}
            />
            <h1 className="h2">Your Order List is Empty</h1>
            <p className="muted" style={{ marginTop: "8px" }}>
              Configure a large-format print job or choose products from our
              catalogue before checking out.
            </p>
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
                marginTop: "24px",
              }}
            >
              <Link to="/print" className="btn btn-primary">
                <span>Start a Print Job</span>
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link to="/shop" className="btn btn-secondary">
                <span>Browse Catalogue</span>
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="checkout-shell">
        <div>
          <span
            className="label-micro"
            style={{ color: "var(--brand-primary)" }}
          >
            Vikipat Digital Storefront
          </span>
          <h1 className="h1" style={{ marginTop: "4px" }}>
            Complete Your Print Job &amp; Order
          </h1>
          <p className="muted" style={{ marginTop: "6px" }}>
            Verify your specifications, attach artwork or request design, and
            submit directly to our Accra production team.
          </p>
        </div>

        <form onSubmit={handleSubmitOrder} className="checkout-grid">
          {/* Main Checkout Flow (Left Column) */}
          <div className="checkout-main-flow">
            {/* Step 1: Artwork summary (captured per job in the configurator) */}
            {customJobs.length > 0 && (
              <div className="checkout-step-card">
                <div className="checkout-step-header">
                  <span className="checkout-step-num">1</span>
                  <div>
                    <h2>Artwork &amp; Creative Files</h2>
                    <span
                      style={{
                        fontSize: "var(--t-micro)",
                        color: "var(--ink-subtle)",
                      }}
                    >
                      Free pre-flight CMYK verification on all uploads
                    </span>
                  </div>
                </div>

                {customJobs.map((job) => (
                  <div
                    key={job.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "12px 0",
                      borderTop: "1px solid var(--line)",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "var(--t-small)" }}>
                        {job.estimate.serviceName}
                      </strong>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 4,
                          fontSize: "var(--t-micro)",
                          color: "var(--ink-subtle)",
                        }}
                      >
                        {job.artworkOption === "upload" ? (
                          <FileCheck size={13} aria-hidden="true" />
                        ) : job.artworkOption === "link" ? (
                          <LinkIcon size={13} aria-hidden="true" />
                        ) : (
                          <HelpCircle size={13} aria-hidden="true" />
                        )}
                        <span>
                          {artworkSummary[job.artworkOption]}
                          {job.artworkName ? ` (${job.artworkName})` : ""}
                        </span>
                      </div>
                    </div>
                    <Link
                      to="/print"
                      className="label-micro"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        color: "var(--brand-primary)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Pencil size={12} aria-hidden="true" />
                      Edit
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {/* Step 2: Contact Information */}
            <div className="checkout-step-card">
              <div className="checkout-step-header">
                <span className="checkout-step-num">2</span>
                <div>
                  <h2>Customer Information</h2>
                  <span
                    style={{
                      fontSize: "var(--t-micro)",
                      color: "var(--ink-subtle)",
                    }}
                  >
                    No account needed. Track order status via one-time email OTP
                  </span>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="field">
                  <label htmlFor="c-name" className="label-micro">
                    Full Name / Primary Contact *
                  </label>
                  <input
                    id="c-name"
                    type="text"
                    className="input"
                    placeholder="e.g. Kwame Osei"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="c-email" className="label-micro">
                    Email Address (for OTP Tracking) *
                  </label>
                  <input
                    id="c-email"
                    type="email"
                    className="input"
                    placeholder="kwame@company.com"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-grid-2" style={{ marginTop: "16px" }}>
                <div className="field">
                  <label htmlFor="c-phone" className="label-micro">
                    Phone / WhatsApp Number *
                  </label>
                  <input
                    id="c-phone"
                    type="tel"
                    className="input"
                    placeholder="055 511 0844"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="c-company" className="label-micro">
                    Company / Organization (Optional)
                  </label>
                  <input
                    id="c-company"
                    type="text"
                    className="input"
                    placeholder="e.g. Acme Ghana Ltd"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Fulfilment & Schedule */}
            <div className="checkout-step-card">
              <div className="checkout-step-header">
                <span className="checkout-step-num">3</span>
                <div>
                  <h2>Fulfilment &amp; Delivery</h2>
                  <span
                    style={{
                      fontSize: "var(--t-micro)",
                      color: "var(--ink-subtle)",
                    }}
                  >
                    Dispatched from {site.address.line1}
                  </span>
                </div>
              </div>

              <div className="fulfilment-selector">
                <label
                  className={`fulfilment-card ${fulfilmentMethod === "delivery" ? "is-active" : ""}`}
                >
                  <input
                    type="radio"
                    name="fulfilment"
                    checked={fulfilmentMethod === "delivery"}
                    onChange={() => setFulfilmentMethod("delivery")}
                  />
                  <div>
                    <strong
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Truck
                        aria-hidden="true"
                        style={{
                          width: 16,
                          height: 16,
                          color: "var(--brand-primary)",
                        }}
                      />
                      Courier Delivery Across Ghana
                    </strong>
                    <span
                      style={{
                        fontSize: "var(--t-micro)",
                        color: "var(--ink-subtle)",
                        display: "block",
                        marginTop: 4,
                      }}
                    >
                      Doorstep dispatch via express dispatch rider in Accra or
                      parcel service nationwide.
                    </span>
                  </div>
                </label>

                <label
                  className={`fulfilment-card ${fulfilmentMethod === "pickup" ? "is-active" : ""}`}
                >
                  <input
                    type="radio"
                    name="fulfilment"
                    checked={fulfilmentMethod === "pickup"}
                    onChange={() => setFulfilmentMethod("pickup")}
                  />
                  <div>
                    <strong
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <MapPin
                        aria-hidden="true"
                        style={{
                          width: 16,
                          height: 16,
                          color: "var(--brand-primary)",
                        }}
                      />
                      Pickup at Studio Counter
                    </strong>
                    <span
                      style={{
                        fontSize: "var(--t-micro)",
                        color: "var(--ink-subtle)",
                        display: "block",
                        marginTop: 4,
                      }}
                    >
                      Free collection from {site.address.line1},{" "}
                      {site.address.line2}.
                    </span>
                  </div>
                </label>
              </div>

              {fulfilmentMethod === "delivery" && (
                <div className="form-grid-2">
                  <div className="field">
                    <label htmlFor="f-address" className="label-micro">
                      Delivery Address / Area in Accra *
                    </label>
                    <input
                      id="f-address"
                      type="text"
                      className="input"
                      placeholder="e.g. Airport Residential, Spintex Road, Osu"
                      required={fulfilmentMethod === "delivery"}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="f-landmark" className="label-micro">
                      Landmark / Digital Address (GhanaPost GPS)
                    </label>
                    <input
                      id="f-landmark"
                      type="text"
                      className="input"
                      placeholder="e.g. GA-183-9022, near Shell station"
                      value={deliveryLandmark}
                      onChange={(e) => setDeliveryLandmark(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="form-grid-2" style={{ marginTop: "16px" }}>
                <div className="field">
                  <label htmlFor="f-deadline" className="label-micro">
                    Target Completion Date / Deadline
                  </label>
                  <input
                    id="f-deadline"
                    type="date"
                    className="input"
                    value={requestedDate}
                    onChange={(e) => setRequestedDate(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="f-notes" className="label-micro">
                    Special Production Instructions
                  </label>
                  <input
                    id="f-notes"
                    type="text"
                    className="input"
                    placeholder="e.g. Eyelets on all 4 corners, matte lamination, etc."
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <section className="checkout-step-card">
              <div className="checkout-step-header">
                <span className="checkout-step-num">4</span>
                <div>
                  <h2>Payment method</h2>
                  <span className="checkout-payment-hint" id="payment-method-hint">
                    Select Mobile Money to continue.
                  </span>
                </div>
              </div>
              <fieldset className="checkout-payment-methods" aria-describedby="payment-method-hint" disabled={submitting}>
                <legend className="checkout-payment-legend">Choose a payment method</legend>
                <label className="checkout-payment-option is-disabled">
                  <input type="radio" name="paymentMethod" value="card" disabled />
                  <CreditCard aria-hidden="true" />
                  <span><strong>Card</strong><small>Currently unavailable</small></span>
                </label>
                <label className={`checkout-payment-option ${paymentMethod === "mobile_money" ? "is-selected" : ""}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="mobile_money"
                    required
                    checked={paymentMethod === "mobile_money"}
                    onChange={() => { setPaymentMethod("mobile_money"); setSubmitError(""); }}
                  />
                  <Smartphone aria-hidden="true" />
                  <span><strong>Mobile Money</strong><small>Pay with your mobile wallet</small></span>
                </label>
              </fieldset>
            </section>
          </div>

          {/* Right Column: Sticky Summary & Paystack Action */}
          <aside className="checkout-summary-card">
            <div className="checkout-summary-header">
              <h3>Order Breakdown</h3>
              <span className="label-micro">
                {count} {count === 1 ? "item" : "items"}
              </span>
            </div>

            {/* Custom Jobs */}
            {customJobs.map((job) => (
              <div key={job.id} className="checkout-item-row">
                <div>
                  <span className="checkout-item-title">
                    {job.estimate.serviceName}
                  </span>
                  <div className="checkout-item-sub">
                    {job.estimate.width} × {job.estimate.height}{" "}
                    {job.estimate.unit} ({job.estimate.totalAreaSqFt} sq ft) ·
                    Qty {job.estimate.quantity}
                  </div>
                  {job.estimate.designFeePesewas > 0 && (
                    <div
                      style={{
                        fontSize: "var(--t-micro)",
                        color: "var(--accent-cyan-ink)",
                      }}
                    >
                      Includes Design Fee (+GH₵{" "}
                      {(job.estimate.designFeePesewas / 100).toFixed(2)})
                    </div>
                  )}
                </div>
                <span className="checkout-item-price">
                  GH₵ {(job.estimate.totalPesewas / 100).toFixed(2)}
                </span>
              </div>
            ))}

            {/* Physical Products */}
            {items.map((item) => (
              <div key={item.product.id} className="checkout-item-row">
                <div>
                  <span className="checkout-item-title">
                    {item.product.name}
                  </span>
                  <div className="checkout-item-sub">
                    {item.qty} × GH₵ {item.product.price} ({item.product.unit})
                  </div>
                </div>
                <span className="checkout-item-price">
                  GH₵ {item.lineTotal.toFixed(2)}
                </span>
              </div>
            ))}

            <div
              style={{
                marginTop: "20px",
                borderTop: "1px solid var(--line)",
                paddingTop: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--t-small)",
                    color: "var(--ink-muted)",
                  }}
                >
                  Estimated Production Total
                </span>
                <strong
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "1.2rem",
                    color: "var(--brand-primary)",
                  }}
                >
                  GH₵ {total.toFixed(2)}
                </strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "var(--t-micro)",
                  color: "var(--ink-subtle)",
                }}
              >
                <span>Delivery Dispatch</span>
                <span>
                  {fulfilmentMethod === "pickup"
                    ? "Free Pickup"
                    : "Billed on dispatch location"}
                </span>
              </div>
            </div>

            {submitError && (
              <div
                role="alert"
                style={{
                  background: pricesRefreshed ? "var(--accent-amber-soft)" : "var(--danger-soft)",
                  color: pricesRefreshed ? "var(--accent-amber-ink)" : "var(--danger)",
                  padding: "10px 14px",
                  borderRadius: "var(--r-md)",
                  marginTop: "16px",
                  fontSize: "var(--t-small)",
                }}
              >
                {submitError}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-block"
              style={{ marginTop: "20px" }}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 aria-hidden="true" className="spin" />
                  <span>Transmitting Order to Studio...</span>
                </>
              ) : (
                <>
                  <Smartphone aria-hidden="true" />
                  <span>Submit Order & Continue to Payment</span>
                </>
              )}
            </button>

            <p
              style={{
                fontSize: "0.72rem",
                color: "var(--ink-subtle)",
                textAlign: "center",
                marginTop: "12px",
                lineHeight: 1.4,
              }}
            >
              By submitting, your order is registered into Vikipat’s operational
              queue. If design review is required, our team verifies artwork
              prior to charging.
            </p>
          </aside>
        </form>
      </div>
    </Layout>
  );
}
