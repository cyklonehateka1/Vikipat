import { Fragment } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, MessageCircle, RefreshCw } from "lucide-react";
import { Layout } from "../components/Layout";
import { ProductCard } from "../components/ProductCard";
import { useCatalog } from "../catalog";
import { OUTCOMES } from "../outcomes";
import { deptHref, whatsappLink } from "../lib/format";
import { site } from "../site";
import { useReveal, useTitle } from "../lib/useReveal";
import { useMaterials } from "../lib/useMaterials";

const SWATCH_TINTS = [
  "var(--brand-primary)",
  "var(--brand-blue)",
  "var(--brand-green)",
  "var(--brand-magenta)",
  "var(--accent-amber)",
];

export default function Home() {
  const { products, departments, loading, error, retry } = useCatalog();
  const { materials } = useMaterials();
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
      {/* --- 1. Hero: asymmetric collage, one message, two actions --- */}
      <section className="hero-section">
        <span className="hero-ghost" aria-hidden="true">
          VIKIPAT
        </span>

        <div className="hero-copy">
          <div className="hero-eyebrow">
            <i aria-hidden="true" />
            <span>Accra's Print &amp; Branding Platform</span>
          </div>

          <h1>
            Print engineered for impact.{" "}
            <span className="highlight">Priced instantly.</span>
          </h1>

          <p>
            Configure banners, apparel and packaging, get an authoritative
            price in seconds, and send it straight to our Accra production
            floor.
          </p>

          <div className="hero-actions">
            <Link to="/print" className="btn btn-primary btn-lg">
              <span>Open the Print Studio</span>
              <ArrowRight aria-hidden="true" />
            </Link>

            <Link to="/track-order" className="btn btn-secondary btn-lg">
              <span>Track Order</span>
            </Link>
          </div>

        </div>

        <div className="hero-visual">
          <div className="hero-visual-chip">
            <strong>24-48h</strong>
            <span>standard turnaround</span>
          </div>
          <div className="hero-visual-main">
            <img
              src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1000&q=85"
              alt="Corporate branded apparel produced by Vikipat"
              loading="eager"
            />
          </div>
          <div className="hero-visual-stamp" aria-hidden="true">
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" />
              <path id="stamp-arc-top" d="M 12,60 A 48,48 0 0 1 108,60" fill="none" />
              <path id="stamp-arc-bottom" d="M 12,60 A 48,48 0 0 0 108,60" fill="none" />
              <text>
                <textPath href="#stamp-arc-top" startOffset="50%" textAnchor="middle">
                  ACCRA · GHANA
                </textPath>
              </text>
              <text>
                <textPath href="#stamp-arc-bottom" startOffset="50%" textAnchor="middle">
                  PRODUCTION FLOOR
                </textPath>
              </text>
              <text x="60" y="67" textAnchor="middle" className="stamp-mark">
                VP
              </text>
            </svg>
          </div>
        </div>
      </section>

      {/* --- 2. Print Studio: the platform's signature feature, not a buried section --- */}
      <section className="reveal">
        <div className="studio-promo">
          <div className="studio-promo-grid">
            <div>
              <span className="studio-promo-eyebrow">
                <i aria-hidden="true" />
                The Vikipat Print Studio
              </span>
              <h2>
                Stop guessing. <em>Configure it, price it, order it.</em>
              </h2>
              <p>
                Tell the Studio what you are making, size it against a real
                reference, and get an authoritative cedi price before you
                commit. Every material, every rate, one place.
              </p>
              <div className="studio-promo-actions">
                <Link to="/print" className="btn btn-primary btn-lg">
                  <span>Open the Print Studio</span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            </div>

            <nav className="studio-promo-list" aria-label="Start from a job">
              {OUTCOMES.slice(0, 4).map((outcome) => (
                <Link key={outcome.slug} to={`/print?need=${outcome.slug}`}>
                  <span>{outcome.label}</span>
                  <ArrowRight aria-hidden="true" size={16} />
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </section>

      {/* --- Scrolling capability marquee --- */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map((rep) => (
            <span key={rep}>
              {[
                "Large Format Banners",
                "Vinyl Stickers",
                "Corporate Apparel",
                "Rigid Board Signage",
                "Vehicle Branding",
                "Packaging & Labels",
                "Event Backdrops",
                "Embroidery",
              ].map((item) => (
                <span key={item}>
                  <i /> {item}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* --- The proof: what actually leaves the press --- */}
      <section className="proof-section reveal">
        <div className="home-lede">
          <h2>What you approve is what prints.</h2>
          <p>
            Every job gets marked up like a real proof before it goes to
            plate, so there is nothing between your approval and the piece
            that comes off the press.
          </p>
        </div>

        <motion.div
          className="proof-sheet"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="proof-frame">
            <span className="proof-crop tl" aria-hidden="true" />
            <span className="proof-crop tr" aria-hidden="true" />
            <span className="proof-crop bl" aria-hidden="true" />
            <span className="proof-crop br" aria-hidden="true" />
            <img
              src="https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=1400&q=85"
              alt="Custom printed apparel proof ready for production"
              loading="lazy"
            />
            <div className="proof-stamp" aria-hidden="true">
              <svg viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" />
                <path id="proof-arc-top" d="M 12,60 A 48,48 0 0 1 108,60" fill="none" />
                <path id="proof-arc-bottom" d="M 12,60 A 48,48 0 0 0 108,60" fill="none" />
                <text>
                  <textPath href="#proof-arc-top" startOffset="50%" textAnchor="middle" className="proof-stamp-arc">
                    APPROVED FOR
                  </textPath>
                </text>
                <text>
                  <textPath href="#proof-arc-bottom" startOffset="50%" textAnchor="middle" className="proof-stamp-arc">
                    PRODUCTION
                  </textPath>
                </text>
                <text x="60" y="67" textAnchor="middle" className="proof-stamp-mark">
                  VIKIPAT
                </text>
              </svg>
            </div>
          </div>

          <div className="proof-colorbar" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>

          <div className="proof-dimension" aria-hidden="true">
            <i />
            <span>ADULT M · CHEST PRINT · 11IN × 14IN</span>
            <i />
          </div>

          <dl className="proof-caption">
            <div className="proof-caption-item">
              <dt>Method</dt>
              <dd>DTF Transfer</dd>
            </div>
            <div className="proof-caption-item">
              <dt>Colour profile</dt>
              <dd>CMYK, wash-durable</dd>
            </div>
            <div className="proof-caption-item">
              <dt>Pre-flight</dt>
              <dd>Passed</dd>
            </div>
            <div className="proof-caption-item">
              <dt>Garment</dt>
              <dd>180gsm cotton tee</dd>
            </div>
          </dl>
        </motion.div>
      </section>

      {/* --- The docket trail: one job's paperwork, stage to stage --- */}
      <section className="docket-section reveal">
        <div className="home-lede">
          <h2>One docket, stage to stage.</h2>
          <p>
            The same job record follows the order from quote to delivery.
            Nothing is re-typed, re-quoted, or lost in a different system.
          </p>
        </div>

        <div className="docket-trail">
          {[
            { stamp: "PAID", eyebrow: "Payment", title: "Paystack confirmed", detail: "MTN MoMo · GH₵83.00" },
            { stamp: "OK'D", eyebrow: "Artwork", title: "Design approved", detail: "Pre-flight passed, CMYK" },
            { stamp: "PRESS", eyebrow: "Production", title: "Job VP-8821", detail: "In production, East Legon" },
            { stamp: "READY", eyebrow: "Delivery", title: "Ready for pickup", detail: "Mallam-Gbawe Road" },
          ].map((job, index, arr) => (
            <Fragment key={job.title}>
              <motion.div
                className="docket"
                initial={{ opacity: 0, y: 20, rotate: index % 2 === 0 ? -2 : 2 }}
                whileInView={{ opacity: 1, y: 0, rotate: index % 2 === 0 ? -2 : 2 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="docket-stub">
                  <div className="docket-stamp">
                    <span>{job.stamp}</span>
                  </div>
                </div>
                <div className="docket-body">
                  <span className="docket-eyebrow">{job.eyebrow}</span>
                  <strong>{job.title}</strong>
                  <span>{job.detail}</span>
                </div>
              </motion.div>
              {index < arr.length - 1 && (
                <ArrowRight className="docket-connector" size={18} aria-hidden="true" />
              )}
            </Fragment>
          ))}
        </div>
      </section>

      {/* --- The swatch fan: every job the Studio prices --- */}
      <section className="fan-section reveal">
        <div className="home-lede">
          <h2>Five jobs. One sample deck.</h2>
          <p>Every outcome the Print Studio configures, fanned out like the material deck on the counter.</p>
        </div>

        <div className="fan">
          {OUTCOMES.map((outcome, index) => {
            const mid = (OUTCOMES.length - 1) / 2;
            const angle = (index - mid) * 13;
            const tint = SWATCH_TINTS[index % SWATCH_TINTS.length];
            const material =
              materials.find((m) => m.outcomes.includes(outcome.slug) && m.badge) ||
              materials.find((m) => m.outcomes.includes(outcome.slug));
            return (
              <motion.div
                key={outcome.slug}
                className="fan-card"
                initial={{ opacity: 0, y: 30, rotate: 0 }}
                whileInView={{ opacity: 1, y: 0, rotate: angle }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                style={{ zIndex: 10 - Math.abs(index - mid) }}
              >
                <Link to={`/print?need=${outcome.slug}`} className="fan-card-link">
                  <div className="fan-card-swatch" style={{ background: tint }}>
                    <span className="fan-card-code" style={{ color: "rgba(255,255,255,0.75)" }}>
                      NO.{String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="fan-card-info">
                    <strong>{outcome.label}</strong>
                    {material && <em>{material.name}</em>}
                    <span>
                      {material ? `from GH₵${(material.ratePesewasPerSqFt / 100).toFixed(2)}/sq ft` : outcome.presets[0].label}
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <nav className="fan-list" aria-label="Every outcome the Print Studio configures">
          {OUTCOMES.map((outcome) => (
            <Link key={outcome.slug} to={`/print?need=${outcome.slug}`}>
              <span>{outcome.label}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </section>

      {/* --- Category Bento Showcase --- */}
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
            architectural signage, or bespoke packaging, our senior production
            team is ready to assist.
          </p>
        </div>

        <div className="closing-banner-actions">
          <Link to="/print" className="btn btn-primary btn-lg">
            <span>Open the Print Studio</span>
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
