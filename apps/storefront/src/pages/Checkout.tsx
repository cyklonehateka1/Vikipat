import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileCheck,
  FileUp,
  HelpCircle,
  Link as LinkIcon,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  Package,
  ShieldCheck,
  Truck,
  UploadCloud,
  X,
} from "lucide-react";
import { Layout } from "../components/Layout";
import { useOrder } from "../order";
import { site } from "../site";
import { useTitle } from "../lib/useReveal";
import "../styles/checkout.css";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:3000/api"
).replace(/\/$/, "");

export default function Checkout() {
  useTitle(`Checkout & Complete Order | ${site.fullName}`);
  const navigate = useNavigate();
  const { items, customJobs, total, totalPesewas, count, clear } = useOrder();

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

  // Artwork Intake State
  const [artworkOption, setArtworkOption] = useState<
    "upload" | "link" | "design_service" | "later"
  >("upload");
  const [uploadedArtworkUrl, setUploadedArtworkUrl] = useState("");
  const [uploadedArtworkName, setUploadedArtworkName] = useState("");
  const [artworkLink, setArtworkLink] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const isEmpty = items.length === 0 && customJobs.length === 0;

  // Handle direct file upload to API
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/quotes/media`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(
          "Upload failed. Please upload a PDF, PNG, JPG or WebP file under 10MB.",
        );
      }

      const data = await res.json();
      setUploadedArtworkUrl(data.url);
      setUploadedArtworkName(data.name || file.name);
    } catch (err: any) {
      setUploadError(err.message || "Could not upload artwork.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerEmail.trim()) {
      setSubmitError("Please provide your name and email address.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const lineItems = [
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
            artworkOption === "design_service",
        })),
        ...items.map((item) => ({
          type: "product" as const,
          productId: item.product.id,
          quantity: item.qty,
        })),
      ];

      const consolidatedNote = [
        customerNote.trim(),
        companyName ? `Company: ${companyName}` : "",
        `Fulfilment: ${fulfilmentMethod === "delivery" ? `Delivery to ${deliveryAddress} (${deliveryLandmark})` : `Pickup at ${site.address.line1}, ${site.address.line2}`}`,
        requestedDate ? `Deadline: ${requestedDate}` : "",
        artworkOption === "link" ? `Artwork Link: ${artworkLink}` : "",
        uploadedArtworkUrl
          ? `Uploaded Artwork: ${uploadedArtworkUrl} (${uploadedArtworkName})`
          : "",
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
          items: lineItems,
          customerNote: consolidatedNote,
          fulfilmentMethod,
          deliveryAddress,
          deliveryLandmark,
          requestedDate,
          artworkOption,
          artworkUrl: uploadedArtworkUrl,
          artworkName: uploadedArtworkName,
          artworkLink,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
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
            {/* Step 1: Artwork Intake */}
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
                    Free pre-flight CMYK verification on all client uploads
                  </span>
                </div>
              </div>

              <div className="artwork-options-grid">
                <button
                  type="button"
                  className={`artwork-option-btn ${artworkOption === "upload" ? "is-active" : ""}`}
                  onClick={() => setArtworkOption("upload")}
                >
                  <FileUp
                    aria-hidden="true"
                    style={{
                      width: 20,
                      height: 20,
                      color: "var(--brand-primary)",
                      marginBottom: 6,
                    }}
                  />
                  <strong>Upload Files Directly</strong>
                  <span>PDF, AI, EPS, or 300 DPI PNG/JPG</span>
                </button>

                <button
                  type="button"
                  className={`artwork-option-btn ${artworkOption === "link" ? "is-active" : ""}`}
                  onClick={() => setArtworkOption("link")}
                >
                  <LinkIcon
                    aria-hidden="true"
                    style={{
                      width: 20,
                      height: 20,
                      color: "var(--brand-primary)",
                      marginBottom: 6,
                    }}
                  />
                  <strong>Cloud Storage Link</strong>
                  <span>Google Drive, WeTransfer, Dropbox</span>
                </button>

                <button
                  type="button"
                  className={`artwork-option-btn ${artworkOption === "design_service" ? "is-active" : ""}`}
                  onClick={() => setArtworkOption("design_service")}
                >
                  <HelpCircle
                    aria-hidden="true"
                    style={{
                      width: 20,
                      height: 20,
                      color: "var(--brand-primary)",
                      marginBottom: 6,
                    }}
                  />
                  <strong>Design from Scratch</strong>
                  <span>Our designers create it (+GH₵100 min)</span>
                </button>

                <button
                  type="button"
                  className={`artwork-option-btn ${artworkOption === "later" ? "is-active" : ""}`}
                  onClick={() => setArtworkOption("later")}
                >
                  <CheckCircle2
                    aria-hidden="true"
                    style={{
                      width: 20,
                      height: 20,
                      color: "var(--brand-primary)",
                      marginBottom: 6,
                    }}
                  />
                  <strong>Send via WhatsApp Later</strong>
                  <span>Attach in chat after ordering</span>
                </button>
              </div>

              {/* Upload Input Area */}
              {artworkOption === "upload" && (
                <div>
                  <label
                    htmlFor="artwork-file"
                    className="artwork-dropzone"
                    style={{ display: "block" }}
                  >
                    <UploadCloud aria-hidden="true" />
                    <p
                      style={{ fontWeight: 700, color: "var(--brand-primary)" }}
                    >
                      {uploading
                        ? "Uploading your artwork..."
                        : "Click to select or drag & drop artwork file"}
                    </p>
                    <span
                      style={{
                        fontSize: "var(--t-micro)",
                        color: "var(--ink-subtle)",
                      }}
                    >
                      Supports PDF, JPG, PNG, WebP up to 10MB
                    </span>
                    <input
                      id="artwork-file"
                      type="file"
                      style={{ display: "none" }}
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </label>

                  {uploadedArtworkName && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginTop: "10px",
                        background: "var(--success-soft)",
                        padding: "8px 14px",
                        borderRadius: "var(--r-md)",
                        color: "var(--success-deep)",
                      }}
                    >
                      <FileCheck
                        aria-hidden="true"
                        style={{ width: 16, height: 16 }}
                      />
                      <span
                        style={{ fontSize: "var(--t-small)", fontWeight: 600 }}
                      >
                        Attached: {uploadedArtworkName}
                      </span>
                    </div>
                  )}

                  {uploadError && (
                    <p
                      style={{
                        color: "var(--danger)",
                        fontSize: "var(--t-small)",
                        marginTop: "8px",
                      }}
                    >
                      {uploadError}
                    </p>
                  )}
                </div>
              )}

              {artworkOption === "link" && (
                <div style={{ marginTop: "12px" }}>
                  <label htmlFor="artwork-link" className="label-micro">
                    Paste Public Shareable Link
                  </label>
                  <input
                    id="artwork-link"
                    type="url"
                    className="input"
                    placeholder="https://drive.google.com/..."
                    value={artworkLink}
                    onChange={(e) => setArtworkLink(e.target.value)}
                  />
                  <span
                    style={{
                      fontSize: "var(--t-micro)",
                      color: "var(--ink-subtle)",
                      marginTop: "4px",
                      display: "block",
                    }}
                  >
                    Make sure link permissions are set to “Anyone with the link
                    can view”.
                  </span>
                </div>
              )}
            </div>

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
                style={{
                  background: "var(--danger-soft)",
                  color: "var(--danger)",
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
              disabled={submitting || uploading}
            >
              {submitting ? (
                <>
                  <Loader2 aria-hidden="true" className="spin" />
                  <span>Transmitting Order to Studio...</span>
                </>
              ) : (
                <>
                  <CreditCard aria-hidden="true" />
                  <span>Submit Order & Continue to Payment</span>
                </>
              )}
            </button>

            <div className="paystack-secure-badge">
              <ShieldCheck
                aria-hidden="true"
                style={{ width: 16, height: 16, color: "#16a34a" }}
              />
              <span>Protected by Paystack • MTN MoMo, Telecel, Cards</span>
            </div>

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
