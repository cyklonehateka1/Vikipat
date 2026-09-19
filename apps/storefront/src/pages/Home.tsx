import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle, RefreshCw } from "lucide-react";
import { Layout } from "../components/Layout";
import { ProductCard } from "../components/ProductCard";
import { PrintEstimator } from "../components/PrintEstimator";
import { useCatalog } from "../catalog";
import { deptHref, whatsappLink } from "../lib/format";
import { site } from "../site";
import { useReveal, useTitle } from "../lib/useReveal";

export default function Home() {
  const { products, departments, loading, error, retry } = useCatalog();
  useTitle(`${site.fullName} | Commercial Printing & Custom Branding Platform`);
  useReveal([loading, departments.length]);

  const featuredProducts = products
    .filter((p) => p.featured)
    .concat(products.filter((p) => !p.featured))
    .slice(0, 8);

  const heroQuoteLink = whatsappLink(
    `Hello ${site.name}, I would like to get a quote for a custom print and branding project.`,
  );

  return (
    <Layout>
      {/* --- 1. Hero: one clear message, one visual, two actions --- */}
      <section className="hero-section">
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <span>Accra’s Commercial Print &amp; Manufacturing Platform</span>
          </div>

          <h1>
            Print engineered for impact.{" "}
            <span className="highlight">Instant prices, paid online.</span>
          </h1>

          <p>
            Configure banners, apparel and packaging, get an authoritative
            price in seconds, and send it straight to our Accra production
            floor.
          </p>

          <div className="hero-actions">
            <Link to="/print" className="btn btn-primary btn-lg">
              <span>Instant Print Estimator</span>
              <ArrowRight aria-hidden="true" />
            </Link>

            <Link to="/track-order" className="btn btn-secondary btn-lg">
              <span>Track Order</span>
            </Link>
          </div>

          <p className="hero-facts">
            CMYK digital &amp; large-format UV printing · Free digital proof
            before production · 1–3 day standard turnaround · Paystack and
            Mobile Money accepted
          </p>
        </div>

        <div className="hero-visual" aria-label="Corporate branded apparel produced by Vikipat">
          <img
            src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1000&q=85"
            alt="Corporate branded apparel produced by Vikipat"
            loading="eager"
          />
        </div>
      </section>

      {/* --- 2. Live Print Estimator --- */}
      <section className="shell section-tight reveal" id="estimator">
        <div
          style={{
            textAlign: "center",
            maxWidth: "720px",
            margin: "0 auto 32px",
          }}
        >
          <span
            className="label-micro"
            style={{ color: "var(--brand-primary)", letterSpacing: "0.08em" }}
          >
            LIVE ESTIMATION ENGINE
          </span>
          <h2 className="h1" style={{ marginTop: "6px" }}>
            Instant Pricing for Banners, Stickers &amp; Displays
          </h2>
          <p className="muted" style={{ marginTop: "8px" }}>
            Adjust dimensions, pick materials, and see your exact job price
            update in real-time. No waiting for email quotes.
          </p>
        </div>

        <PrintEstimator compact={false} />
      </section>

      {/* --- 3. Category Bento Showcase --- */}
      <section className="categories-section reveal">
        <div className="categories-header">
          <p>What We Produce</p>
          <h2>Explore Print &amp; Branding Categories</h2>
        </div>

        {error && (
          <div className="state" style={{ margin: "0 auto" }}>
            <h2 className="h3">We could not load the catalogue</h2>
            <p>{error}</p>
            <div className="state-actions">
              <button className="btn btn-primary" onClick={retry}>
                <RefreshCw aria-hidden="true" /> Try again
              </button>
            </div>
          </div>
        )}

        <div className="categories-grid">
          {departments.map((department) => (
            <Link
              className="category-card"
              to={deptHref(department.slug)}
              key={department.slug}
            >
              <div className="category-card-media">
                <img
                  src={department.image}
                  alt={department.imageAlt}
                  loading="lazy"
                />
              </div>
              <div className="category-card-content">
                <h3>{department.name}</h3>
                <p>{department.blurb}</p>
                <div className="category-card-link">
                  <span>View collection</span>
                  <ArrowRight aria-hidden="true" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* --- 6. Featured / Best Sellers Showcase --- */}
      <section className="shell section-tight reveal">
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <div>
            <p
              className="label-micro"
              style={{ color: "var(--brand-primary)", marginBottom: "4px" }}
            >
              Best Sellers in Accra
            </p>
            <h2 className="h1">Popular Print &amp; Branding Items</h2>
          </div>
          <Link to="/shop" className="btn btn-secondary">
            <span>View All Products</span>
            <ArrowRight aria-hidden="true" style={{ width: 16, height: 16 }} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-products">
            {Array.from({ length: 4 }).map((_, i) => (
              <div className="card-skeleton" key={i}>
                <div className="skeleton sk-media" />
                <div className="skeleton sk-line" style={{ width: "60%" }} />
                <div className="skeleton sk-line" style={{ width: "40%" }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-products">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Corporate Capabilities */}
      <section className="corporate-section reveal">
        <div className="corporate-copy">
          <p className="eyebrow">Enterprise &amp; Institutions</p>
          <h2>Corporate Supply &amp; Contract Printing</h2>
          <p>
            Reliable print manufacturing support for businesses, marketing
            agencies, schools, and NGOs across West Africa.
          </p>
          <Link className="btn btn-primary btn-lg" to="/contact">
            Request a corporate quote <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <div className="corporate-capabilities">
          {[
            "Large Format Signage",
            "Corporate Uniforms & Tees",
            "Die-Cut Packaging & Labels",
            "Vehicle Fleet Graphics",
            "Trade Show Banners",
            "Promotional Souvenirs",
            "Exhibition Photo Walls",
            "Corporate Identity Kits",
          ].map((item, index) => (
            <div key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item}</strong>
            </div>
          ))}
        </div>
      </section>

      {/* --- 6. Closing CTA --- */}
      <section className="closing-banner reveal">
        <div className="closing-banner-copy">
          <p className="eyebrow">Custom Solutions &amp; Corporate Supply</p>
          <h2>Have a bespoke project or high-volume order?</h2>
          <p className="sub">
            Whether you need 5,000 conference packs, complete vehicle branding,
            architectural signage, or bespoke packaging—our senior production
            team is ready to assist.
          </p>
        </div>

        <div className="closing-banner-actions">
          <Link to="/print" className="btn btn-primary btn-lg">
            <span>Launch Print Estimator</span>
          </Link>
          <a href={heroQuoteLink} className="btn btn-whatsapp btn-lg">
            <MessageCircle aria-hidden="true" />
            <span>Chat on WhatsApp</span>
          </a>
        </div>
      </section>
    </Layout>
  );
}
