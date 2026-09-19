import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  FileText,
  MessageCircle,
  PackageCheck,
  Phone,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Layout } from "../components/Layout";
import { site } from "../site";
import { telLink, whatsappLink } from "../lib/format";
import { useTitle } from "../lib/useReveal";
import "../styles/checkout.css";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:3000/api"
).replace(/\/$/, "");

export default function OrderConfirmation() {
  const [params] = useSearchParams();
  const orderNumber = params.get("orderNumber") || "VP-EXAMPLE";
  const email = params.get("email") || "";
  const paymentReference = params.get("payment") || params.get("reference") || "";
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "checking" | "paid" | "pending" | "failed">(
    paymentReference ? "checking" : "idle",
  );

  useTitle(`Order Confirmed: ${orderNumber} | ${site.fullName}`);

  const handleCopyOrderNumber = () => {
    navigator.clipboard.writeText(orderNumber);
    alert(`Order Number ${orderNumber} copied to clipboard!`);
  };

  useEffect(() => {
    if (!paymentReference) return;
    let cancelled = false;
    fetch(`${API_BASE}/payments/paystack/verify/${encodeURIComponent(paymentReference)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Payment is not confirmed yet.");
        if (!cancelled) setPaymentStatus(data.paid ? "paid" : "pending");
      })
      .catch(() => {
        if (!cancelled) setPaymentStatus("pending");
      });
    return () => {
      cancelled = true;
    };
  }, [paymentReference]);

  return (
    <Layout>
      <div className="checkout-shell">
        <div className="confirmation-hero">
          <div className="confirmation-check">
            <CheckCircle2
              aria-hidden="true"
              style={{ width: 38, height: 38 }}
            />
          </div>

          <span
            className="label-micro"
            style={{ color: "var(--brand-primary)", letterSpacing: "0.1em" }}
          >
            ORDER TRANSMITTED TO PRODUCTION DESK
          </span>
          <h1 className="h1" style={{ marginTop: "8px" }}>
            Thank You for Printing with Vikipat!
          </h1>
          <p
            className="muted"
            style={{ maxWidth: "48ch", margin: "8px auto 0" }}
          >
            Your job specifications have entered our live operational queue. Our
            pre-flight team will inspect the file parameters and notify you.
          </p>

          <div style={{ margin: "24px 0" }}>
            <span
              style={{
                fontSize: "var(--t-small)",
                color: "var(--ink-subtle)",
                display: "block",
              }}
            >
              Your Unique Order Reference Number
            </span>
            <div className="confirmation-order-tag">{orderNumber}</div>
            <div
              style={{ display: "flex", justifyContent: "center", gap: "8px" }}
            >
              <button
                type="button"
                className="btn btn-quiet btn-sm"
                onClick={handleCopyOrderNumber}
              >
                <Copy aria-hidden="true" style={{ width: 14, height: 14 }} />
                <span>Copy Order Number</span>
              </button>
            </div>
            {paymentReference && (
              <p
                style={{
                  marginTop: "10px",
                  fontSize: "var(--t-micro)",
                  color: "var(--ink-subtle)",
                }}
              >
                Payment reference reserved: <strong>{paymentReference}</strong>
              </p>
            )}
            {paymentReference && (
              <div className={`payment-confirmation-status is-${paymentStatus}`}>
                <ShieldCheck aria-hidden="true" />
                <span>
                  {paymentStatus === "checking"
                    ? "Checking payment confirmation..."
                    : paymentStatus === "paid"
                      ? "Payment confirmed. Your job is ready for production review."
                      : "Payment is pending. If you have paid, confirmation will update automatically once Paystack notifies us."}
                </span>
              </div>
            )}
          </div>

          <div
            style={{
              background: "var(--surface-2)",
              padding: "20px",
              borderRadius: "var(--r-xl)",
              textAlign: "left",
              border: "1px solid var(--line)",
              margin: "24px 0",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--display)",
                fontSize: "1rem",
                fontWeight: 800,
                marginBottom: "10px",
              }}
            >
              Next Steps for Your Order
            </h3>
            <ul
              style={{
                display: "grid",
                gap: "10px",
                fontSize: "var(--t-small)",
                color: "var(--ink-muted)",
              }}
            >
              <li style={{ display: "flex", gap: "8px" }}>
                <CheckCircle2
                  aria-hidden="true"
                  style={{
                    width: 16,
                    height: 16,
                    color: "var(--brand-primary)",
                    flex: "none",
                    marginTop: 2,
                  }}
                />
                <span>
                  <strong>Email Confirmation:</strong> We sent your initial
                  confirmation receipt to{" "}
                  <strong>{email || "your email"}</strong>.
                </span>
              </li>
              <li style={{ display: "flex", gap: "8px" }}>
                <CheckCircle2
                  aria-hidden="true"
                  style={{
                    width: 16,
                    height: 16,
                    color: "var(--brand-primary)",
                    flex: "none",
                    marginTop: 2,
                  }}
                />
                <span>
                  <strong>Pre-Flight &amp; Digital Proof:</strong> If design or
                  proofing was requested, our graphics team will share a digital
                  mock-up before pressing.
                </span>
              </li>
              <li style={{ display: "flex", gap: "8px" }}>
                <CheckCircle2
                  aria-hidden="true"
                  style={{
                    width: 16,
                    height: 16,
                    color: "var(--brand-primary)",
                    flex: "none",
                    marginTop: 2,
                  }}
                />
                <span>
                  <strong>Live Tracking:</strong> Track exact production stages
                  (pre-flight, printing, QC, dispatch) on our tracking portal
                  anytime using your email.
                </span>
              </li>
            </ul>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              justifyContent: "center",
              marginTop: "28px",
            }}
          >
            <Link to="/track-order" className="btn btn-primary btn-lg">
              <PackageCheck aria-hidden="true" />
              <span>Track Live Order Status</span>
              <ArrowRight aria-hidden="true" />
            </Link>

            <a
              href={whatsappLink(
                `Hello Vikipat, I just placed order ${orderNumber}. Can you confirm you received it?`,
              )}
              className="btn btn-whatsapp btn-lg"
            >
              <MessageCircle aria-hidden="true" />
              <span>Chat with Production on WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
