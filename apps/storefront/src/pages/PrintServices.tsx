import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout, PageHead } from "../components/Layout";
import { Crumbs } from "../components/Primitives";
import { PrintEstimator } from "../components/PrintEstimator";
import { LARGE_FORMAT_MATERIALS } from "../types/pricing";
import { site } from "../site";
import { useTitle } from "../lib/useReveal";

export default function PrintServices() {
  const [params] = useSearchParams();
  const initialMaterial = params.get("material") || "flexy-banner";
  useTitle(`Commercial Print & Large Format Studio | ${site.fullName}`);

  return (
    <Layout>
      <PageHead
        title="Commercial Print &amp; Large Format Studio"
        lede="Configure custom banners, stickers, signage, reflective vinyl, and rigid boards with real-time cedi pricing, automatic square footage calculations, and instant order release."
        stats={[
          { label: "Substrates", value: `${LARGE_FORMAT_MATERIALS.length}` },
          { label: "Standard Turnaround", value: "24-48h" },
        ]}
      >
        <Crumbs
          trail={[
            { label: "Home", to: "/" },
            { label: "Commercial Print Studio" },
          ]}
        />
      </PageHead>

      <section className="shell section-tight">
        {/* Main Interactive Print Estimator Component */}
        <PrintEstimator initialMaterial={initialMaterial} />
      </section>

      {/* Substrate Catalog & Technical Specs */}
      <section className="shell section">
        <div
          style={{
            textAlign: "center",
            maxWidth: "700px",
            margin: "0 auto 40px",
          }}
        >
          <span
            className="label-micro"
            style={{ color: "var(--brand-primary)" }}
          >
            Technical Substrate Guide
          </span>
          <h2 className="h2" style={{ marginTop: "6px" }}>
            Materials Engineered for Ghanaian Weather &amp; Indoor Elegance
          </h2>
          <p className="muted" style={{ marginTop: "8px" }}>
            All media printed with UV-stabilized, high-density CMYK inks to
            prevent sun fading, peeling, and rain damage.
          </p>
        </div>

        <div className="grid grid-2">
          {LARGE_FORMAT_MATERIALS.map((mat) => (
            <div
              key={mat.code}
              style={{
                background: "#ffffff",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-xl)",
                padding: "24px",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "8px",
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "var(--display)",
                      fontSize: "1.15rem",
                      fontWeight: 800,
                      color: "var(--ink)",
                    }}
                  >
                    {mat.name}
                  </h3>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontWeight: 800,
                      color: "var(--brand-primary)",
                      fontSize: "1rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    GH₵ {(mat.walkInRatePesewas / 100).toFixed(2)} / sq ft
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "var(--t-small)",
                    color: "var(--ink-muted)",
                    lineHeight: 1.5,
                    marginBottom: "12px",
                  }}
                >
                  {mat.description}
                </p>
              </div>

              <div
                style={{
                  borderTop: "1px solid var(--line)",
                  paddingTop: "12px",
                  marginTop: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--t-micro)",
                    color: "var(--ink-subtle)",
                  }}
                >
                  <strong>Best for:</strong> {mat.typicalUses}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Production Transparency */}
      <section className="shell section-tight">
        <div className="fact-list">
          <div>
            <h3>Nearest-Cedi Accuracy</h3>
            <p>
              Transparent deterministic pricing matching Vikipat’s official
              shop rate sheet.
            </p>
          </div>
          <div>
            <h3>Pre-Flight File Checks</h3>
            <p>
              Every file is audited for resolution, color profile, and bleed
              before print release.
            </p>
          </div>
          <div>
            <h3>Rush Production Available</h3>
            <p>
              Same-day and 24-hour turnaround options for urgent commercial
              installations.
            </p>
          </div>
          <div>
            <h3>Accra Courier &amp; Pickup</h3>
            <p>
              Direct doorstep delivery across Accra or counter pickup at our
              East Legon studio.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
