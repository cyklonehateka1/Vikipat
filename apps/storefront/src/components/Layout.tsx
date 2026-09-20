import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  Search,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import { nav, site } from "../site";
import { matches, productImage, useCatalog } from "../catalog";
import { useOrder } from "../order";
import { deptHref, searchHref, telLink, whatsappLink } from "../lib/format";
import { useOverlay } from "../lib/useOverlay";
import { Price } from "./Primitives";
import { OrderDrawer } from "./OrderDrawer";
import vikipatLogo from "../assets/vikipat_logo.png";

const greeting = whatsappLink(
  `Hello ${site.name}, I would like to ask about a custom print project.`,
);

export function Brand({ className = "" }: { className?: string }) {
  return (
    <Link
      className={`brand ${className}`.trim()}
      to="/"
      aria-label={`${site.fullName}, home`}
    >
      <img
        src={vikipatLogo}
        alt="Vikipat Media Solutions Logo"
        className="brand-logo-img"
        style={{ height: "42px", width: "auto", objectFit: "contain" }}
      />
    </Link>
  );
}

/**
 * High-speed autocomplete search with instant product thumbnail previews.
 */
function HeadSearch({ onNavigate }: { onNavigate?: () => void }) {
  const { products } = useCatalog();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = term.trim()
    ? products.filter((product) => matches(product, term)).slice(0, 5)
    : [];

  useEffect(() => {
    const onClickAway = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  const go = (event: React.FormEvent) => {
    event.preventDefault();
    const query = term.trim();
    if (!query) return;
    navigate(searchHref(query));
    setOpen(false);
    setTerm("");
    onNavigate?.();
  };

  return (
    <div className="head-search" ref={wrapRef}>
      <form onSubmit={go} role="search">
        <Search aria-hidden="true" />
        <label className="visually-hidden" htmlFor="site-search">
          Search products and printing services
        </label>
        <input
          id="site-search"
          type="search"
          value={term}
          placeholder="Search banners, SAV stickers, shirts, cards..."
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
        {term && (
          <button
            type="button"
            className="head-search-clear"
            onClick={() => {
              setTerm("");
              setOpen(false);
            }}
            aria-label="Clear search"
          >
            <X />
          </button>
        )}
      </form>

      {open && suggestions.length > 0 && (
        <div className="suggest">
          {suggestions.map((product) => (
            <Link
              className="suggest-item"
              key={product.id}
              to={`/product/${product.id}`}
              onClick={() => {
                setOpen(false);
                setTerm("");
                onNavigate?.();
              }}
            >
              <img
                src={productImage(product)}
                alt={product.name}
                width={44}
                height={44}
                loading="lazy"
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="suggest-name">{product.name}</span>
                <span className="suggest-meta">
                  {product.department} · {product.unit}
                </span>
              </div>
              <div style={{ flex: "none", marginLeft: "auto" }}>
                <Price value={product.price} />
              </div>
            </Link>
          ))}
          <button className="suggest-all" onClick={go}>
            <span>See all results for “{term.trim()}”</span>
            <ChevronRight
              aria-hidden="true"
              style={{ width: 16, height: 16 }}
            />
          </button>
        </div>
      )}
    </div>
  );
}

function MenuSheet({ onClose }: { onClose: () => void }) {
  const { departments } = useCatalog();
  const { panelRef, closeRef } = useOverlay(onClose);

  return (
    <>
      <button
        className="scrim"
        onClick={onClose}
        tabIndex={-1}
        aria-hidden="true"
      />
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        ref={panelRef}
      >
        <div className="sheet-top">
          <Brand />
          <button
            ref={closeRef}
            className="icon-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X />
          </button>
        </div>

        <div className="sheet-body">
          <div className="sheet-search">
            <HeadSearch onNavigate={onClose} />
          </div>

          <div style={{ padding: "0 var(--s5) var(--s3)" }}>
            <Link
              to="/print"
              className="btn btn-primary btn-block"
              onClick={onClose}
            >
              Open the Print Studio
            </Link>
          </div>

          <nav className="sheet-nav" aria-label="Main Navigation">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={onClose}
              >
                <span>{item.label}</span>
                <span className="code">{item.code}</span>
              </NavLink>
            ))}
          </nav>

          <p className="label-micro sheet-heading">
            Print &amp; Branding Categories
          </p>
          <nav className="sheet-nav" aria-label="Departments">
            {departments.map((department) => (
              <NavLink
                key={department.slug}
                to={deptHref(department.slug)}
                onClick={onClose}
              >
                <span>{department.name}</span>
                <span className="code">
                  {department.count} {department.count === 1 ? "item" : "items"}
                </span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sheet-foot">
          <a className="btn btn-whatsapp btn-block" href={greeting}>
            <MessageCircle aria-hidden="true" /> Chat on WhatsApp
          </a>
          <a className="btn btn-secondary btn-block" href={telLink}>
            <Phone aria-hidden="true" /> Call Studio: {site.phoneDisplay}
          </a>
        </div>
      </div>
    </>
  );
}

function Masthead() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { departments } = useCatalog();
  const { count, pulse, openDrawer, drawerOpen } = useOrder();
  const [bumped, setBumped] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!pulse) return;
    setBumped(true);
    const timer = window.setTimeout(() => setBumped(false), 450);
    return () => window.clearTimeout(timer);
  }, [pulse]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      {/* Top Value / Announcement Bar */}
      <div className="utility">
        <div className="utility-inner">
          <span className="utility-note">
            <span>
              Accra’s Commercial Printing &amp; Custom Branding Engine
            </span>
          </span>
          <span className="utility-badge utility-hide-sm">
            <CheckCircle2
              aria-hidden="true"
              style={{ width: 12, height: 12 }}
            />{" "}
            Free Artwork Pre-Flight Check
          </span>
          <Link
            to="/track-order"
            className="utility-note utility-hide-sm"
            style={{ color: "#ffffff" }}
          >
            <PackageCheck aria-hidden="true" /> Track Order Status
          </Link>
          <span className="utility-note utility-hide-sm">
            <Truck aria-hidden="true" /> Delivery across {site.deliveryArea}
          </span>
          <a href={telLink} className="utility-hide-sm">
            <Phone aria-hidden="true" style={{ width: 12, height: 12 }} />{" "}
            {site.phoneDisplay}
          </a>
        </div>
      </div>

      {/* Main Glassmorphic Header */}
      <header className="masthead">
        <div className="masthead-inner">
          <Brand />
          <HeadSearch />

          <div className="head-actions">
            <Link
              to="/print"
              className="btn btn-primary btn-sm utility-hide-sm"
            >
              <span>Print Studio</span>
            </Link>

            <Link
              to="/track-order"
              className="btn btn-secondary btn-sm utility-hide-sm"
            >
              <PackageCheck aria-hidden="true" />
              <span>Track Order</span>
            </Link>

            <button
              className={`list-btn${bumped ? " is-bumped" : ""}`}
              onClick={openDrawer}
              aria-label={`Open your order list, ${count} ${count === 1 ? "item" : "items"}`}
            >
              <ShoppingBag aria-hidden="true" />
              <span className="utility-hide-sm">Order List</span>
              <span className="list-count">{count}</span>
            </button>

            <button
              className="icon-btn menu-btn"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M4 6h16M4 12h16M4 18h16"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Department Sub-Navigation Bar */}
      <nav className="deptnav" aria-label="Print Categories">
        <div className="deptnav-inner">
          <NavLink to="/print" className="studio-link">
            <strong>Print Studio</strong>
          </NavLink>
          <NavLink to="/shop" end>
            All Products
          </NavLink>
          {departments.map((department) => (
            <NavLink key={department.slug} to={deptHref(department.slug)}>
              {department.name}
            </NavLink>
          ))}
          <div className="deptnav-end">
            <NavLink to="/track-order">Track Order</NavLink>
            <NavLink to="/faq">Ordering Guide</NavLink>
            <NavLink to="/about">About Studio</NavLink>
            <NavLink to="/contact">Contact &amp; Custom Quotes</NavLink>
          </div>
        </div>
      </nav>

      {menuOpen && <MenuSheet onClose={() => setMenuOpen(false)} />}
      {drawerOpen && <OrderDrawer />}
    </>
  );
}

function Footer() {
  const { departments } = useCatalog();

  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <div className="footer-logo-panel">
            <Brand />
          </div>
          <p>
            {site.fullName} is Ghana’s trusted partner for premium commercial
            printing, custom corporate apparel, precision embroidery,
            large-format signs, and branded merchandise.
          </p>
          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <Link to="/print" className="btn btn-accent btn-sm">
              Open the Print Studio
            </Link>
            <a className="btn btn-whatsapp btn-sm" href={greeting}>
              <MessageCircle aria-hidden="true" /> WhatsApp Counter
            </a>
          </div>
        </div>

        <div className="footer-col">
          <h2>Products &amp; Services</h2>
          <Link to="/print">Print Studio</Link>
          <Link to="/shop">View Full Catalogue</Link>
          {departments.map((department) => (
            <Link key={department.slug} to={deptHref(department.slug)}>
              {department.name}
            </Link>
          ))}
        </div>

        <div className="footer-col">
          <h2>Customer Care &amp; Tracking</h2>
          <Link to="/track-order">Track Your Order Status</Link>
          <Link to="/about">About Our Studio</Link>
          <Link to="/faq">Artwork &amp; File Guidelines</Link>
          <Link to="/faq">Production &amp; Turnaround</Link>
          <Link to="/contact">Request Custom Quote</Link>
          <a href={`mailto:${site.email}`}>{site.email}</a>
        </div>

        <div className="footer-col">
          <h2>Studio &amp; Workshop</h2>
          <p style={{ display: "flex", gap: "8px" }}>
            <MapPin
              aria-hidden="true"
              style={{
                width: 18,
                height: 18,
                flex: "none",
                color: "var(--accent-cyan)",
              }}
            />
            <span>
              {site.address.line1}, {site.address.line2}
            </span>
          </p>
          <p
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <Phone
              aria-hidden="true"
              style={{ width: 16, height: 16, color: "var(--accent-cyan)" }}
            />
            <a href={telLink}>{site.phoneDisplay}</a>
            <span aria-hidden="true">/</span>
            <a href={`tel:${site.whatsappDial}`}>{site.whatsappDisplay}</a>
          </p>
          <div style={{ marginTop: "6px" }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "var(--t-micro)",
                color: "var(--ink-subtle)",
                marginBottom: "4px",
              }}
            >
              <Clock aria-hidden="true" style={{ width: 13, height: 13 }} />{" "}
              Opening Hours:
            </span>
            {site.hours.map((row) => (
              <div className="footer-hours" key={row.days}>
                <span>{row.days}</span>
                <span>{row.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {site.fullName}. All rights reserved.
        </span>
        <div className="footer-badges">
          <span>Crafted in Accra, Ghana</span>
          <span>•</span>
          <span>Paystack Enabled</span>
          <span>•</span>
          <span>Fast Nationwide Dispatch</span>
        </div>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Masthead />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </>
  );
}

/** Shared page header used by inner routes. */
export function PageHead({
  title,
  lede,
  stats,
  children,
}: {
  title: string;
  lede?: string;
  stats?: { label: string; value: string }[];
  children?: React.ReactNode;
}) {
  return (
    <section className="page-head">
      <div className="page-head-inner">
        <div>
          {children}
          <h1 className="h1">{title}</h1>
          {lede && <p className="lede">{lede}</p>}
        </div>
        {stats && stats.length > 0 && (
          <dl className="head-stats">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
