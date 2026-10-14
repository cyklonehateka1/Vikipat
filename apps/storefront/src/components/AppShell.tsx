import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  House,
  MessageCircle,
  Package,
  Printer,
  Search as SearchIcon,
  ShoppingCart,
  Store,
} from 'lucide-react';
import { useCatalog } from '../catalog';
import { useOrder } from '../order';
import { nav, site } from '../site';
import { deptHref, greetingLink, mapsLink, telLink } from '../lib/format';
import { useReveal } from '../lib/useReveal';
import { SearchSheet } from './Search';
import { ToastOutlet } from './Toast';
import logoInk from '../assets/brand/logo-ink.png';
import logoPaper from '../assets/brand/logo-full-paper.png';

export function Brand() {
  return (
    <Link className="brand" to="/" viewTransition aria-label={`${site.fullName}, home`}>
      <img src={logoInk} alt="" width={746} height={390} />
    </Link>
  );
}

/** Badge that bumps whenever something is added to the cart. */
function CartCount() {
  const { count, pulse } = useOrder();
  const [bumped, setBumped] = useState(false);

  useEffect(() => {
    if (!pulse) return;
    setBumped(true);
    const timer = window.setTimeout(() => setBumped(false), 520);
    return () => window.clearTimeout(timer);
  }, [pulse]);

  if (!count) return null;
  return (
    <span className={`count-badge${bumped ? ' is-bumped' : ''}`} aria-hidden="true">
      {count > 99 ? '99+' : count}
    </span>
  );
}

const tabs = [
  { label: 'Home', to: '/', icon: House, match: (path: string) => path === '/' },
  { label: 'Print', to: '/print', icon: Printer, match: (path: string) => path.startsWith('/print') },
  {
    label: 'Shop',
    to: '/shop',
    icon: Store,
    match: (path: string) => ['/shop', '/department', '/search', '/product'].some((p) => path.startsWith(p)),
  },
  {
    label: 'Track',
    to: '/track-order',
    icon: Package,
    match: (path: string) => path.startsWith('/track-order') || path.startsWith('/confirmation'),
  },
  {
    label: 'Cart',
    to: '/cart',
    icon: ShoppingCart,
    match: (path: string) => ['/cart', '/checkout', '/list'].some((p) => path.startsWith(p)),
  },
];

/** The phone tab dock. A sun blob marks the current tab and slides between tabs. */
function TabDock() {
  const { pathname } = useLocation();
  const { count } = useOrder();
  const active = tabs.findIndex((tab) => tab.match(pathname));

  return (
    <nav className="dock" aria-label="Main">
      {active >= 0 && <span className="dock-blob" style={{ '--i': active } as React.CSSProperties} aria-hidden="true" />}
      {tabs.map(({ label, to, icon: Icon }, index) => (
        <Link
          key={to}
          to={to}
          viewTransition
          aria-current={index === active ? 'page' : undefined}
          aria-label={label === 'Cart' && count ? `Cart, ${count} ${count === 1 ? 'item' : 'items'}` : undefined}
        >
          <span className="dock-icon">
            <Icon aria-hidden="true" strokeWidth={index === active ? 2.4 : 2} />
            {label === 'Cart' && <CartCount />}
          </span>
          <span className="visually-hidden">{label}</span>
        </Link>
      ))}
    </nav>
  );
}

const headerLinks = [{ label: 'Home', to: '/' }, ...nav];

function SiteHeader({ onSearch }: { onSearch: () => void }) {
  const { count } = useOrder();

  return (
    <header className="site-header">
      <div className="site-header-bar">
        <Brand />
        <nav className="site-nav" aria-label="Main">
          {headerLinks.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} viewTransition>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="site-header-actions">
          <button type="button" className="icon-btn" onClick={onSearch} aria-label="Search">
            <SearchIcon aria-hidden="true" />
          </button>
          <a className="icon-btn" href={greetingLink} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">
            <MessageCircle className="wa" aria-hidden="true" />
          </a>
          <Link
            className="btn btn-primary"
            to="/cart"
            viewTransition
            aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}
          >
            <ShoppingCart aria-hidden="true" />
            Cart
            <CartCount />
          </Link>
        </div>
      </div>
    </header>
  );
}

function TopBar({ title, back, onSearch }: { title?: string; back?: string; onSearch: () => void }) {
  const navigate = useNavigate();

  const goBack = () => {
    // Walk back through history when there is somewhere to go; a visitor who
    // landed straight on this page goes to the fallback instead of off-site.
    const index = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (index > 0) navigate(-1);
    else navigate(back ?? '/');
  };

  return (
    <header className={`topbar${back ? ' is-inner' : ''}`}>
      {back ? (
        <>
          <button type="button" className="icon-btn" onClick={goBack} aria-label="Back">
            <ArrowLeft aria-hidden="true" />
          </button>
          <span className="topbar-title">{title}</span>
        </>
      ) : (
        <Brand />
      )}
      <div className="topbar-actions">
        <button type="button" className="icon-btn" onClick={onSearch} aria-label="Search">
          <SearchIcon aria-hidden="true" />
        </button>
        <a className="icon-btn" href={greetingLink} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">
          <MessageCircle className="wa" aria-hidden="true" />
        </a>
      </div>
    </header>
  );
}

function SiteFooter() {
  const { departments } = useCatalog();

  return (
    <footer className="site-footer on-dark">
      <div className="container">
        <div className="site-footer-grid">
          <div className="site-footer-brand">
            <img src={logoPaper} alt={site.fullName} width={746} height={448} loading="lazy" />
            <p>Banners, signs, shirts, stickers and gifts, printed at our workshop in Accra.</p>
          </div>
          <div className="site-footer-links">
            <div>
              <h2>Order</h2>
              <nav aria-label="Order">
                <Link to="/print">Print a job</Link>
                <Link to="/shop">Shop everything</Link>
                {departments.slice(0, 4).map((department) => (
                  <Link key={department.slug} to={deptHref(department.slug)}>
                    {department.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div>
              <h2>Help</h2>
              <nav aria-label="Help">
                <Link to="/track-order">Track an order</Link>
                <Link to="/faq">Help and FAQ</Link>
                <Link to="/contact">Contact and quotes</Link>
                <Link to="/about">About Vikipat</Link>
              </nav>
            </div>
            <div className="site-footer-contact">
              <h2>Visit</h2>
              <p>
                {site.address.line1}
                <br />
                {site.address.line2}
              </p>
              <a href={mapsLink} target="_blank" rel="noreferrer">
                Get directions
              </a>
              <a href={telLink}>Call {site.phoneDisplay}</a>
              <a href={greetingLink} target="_blank" rel="noreferrer">
                WhatsApp {site.whatsappDisplay}
              </a>
              <a href={`mailto:${site.email}`}>{site.email}</a>
            </div>
          </div>
        </div>
        <p className="site-footer-legal">
          © {new Date().getFullYear()} {site.fullName}. Payments are handled securely by Paystack.
        </p>
      </div>
    </footer>
  );
}

/**
 * The frame around every page. Phones get a top bar and a floating tab dock;
 * from 1024 px there is one header instead. A page can swap the dock for its
 * own floating action bar (price, pay, add to cart).
 */
export function AppShell({
  children,
  title,
  back,
  bar,
  barPhoneOnly = false,
  barNarrow = false,
  tabs: showTabs = true,
  footer = true,
}: {
  children: React.ReactNode;
  /** Short title for the phone top bar on inner pages. */
  title?: string;
  /** Where Back goes when there is no history, e.g. a shared link. */
  back?: string;
  bar?: React.ReactNode;
  barPhoneOnly?: boolean;
  /** Match the bar to a narrow, centred page column on wide screens. */
  barNarrow?: boolean;
  tabs?: boolean;
  footer?: boolean;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  useReveal(mainRef);

  const shellClass = [
    'app',
    bar ? 'app--bar' : showTabs ? 'app--tabs' : 'app--bare',
    barPhoneOnly ? 'app--bar-phone' : '',
    import.meta.env.VITE_DEMO === '1' ? 'app--demo' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={shellClass}>
      {/* Focus is moved by hand: in the hash-routed demo, following #main would change the route. */}
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Skip to content
      </a>
      {import.meta.env.VITE_DEMO === '1' && (
        <p className="demo-note">Sample data. No real orders or payments.</p>
      )}
      <SiteHeader onSearch={() => setSearchOpen(true)} />
      <TopBar title={title} back={back} onSearch={() => setSearchOpen(true)} />
      <main id="main" tabIndex={-1} className="app-main" ref={mainRef}>
        {children}
      </main>
      {footer && <SiteFooter />}
      {bar ? (
        <div
          className={`action-bar${barPhoneOnly ? ' action-bar--phone' : ''}${barNarrow ? ' action-bar--narrow' : ''}`}
        >
          <div className="action-bar-inner">{bar}</div>
        </div>
      ) : (
        showTabs && <TabDock />
      )}
      <ToastOutlet />
      {searchOpen && <SearchSheet onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
