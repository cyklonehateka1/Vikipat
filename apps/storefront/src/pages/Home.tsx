import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Coffee, MessageCircle, MousePointer2, Package, Presentation } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import {
  BrandCardArt,
  InkDropsArt,
  MugArt,
  PrinterCardArt,
  ShirtArt,
  ShirtCardArt,
  StickerArt,
  SwatchFanArt,
  TagArt,
  TypeCardArt,
} from '../components/HeroArt';
import { ArtworkStepArt, OrderingArt, PayStepArt, SizeStepArt } from '../components/HomeArt';
import { Words } from '../components/Motion';
import { OurWork } from '../components/OurWork';
import { ProductGrid } from '../components/ProductGrid';
import { QuickPrice } from '../components/QuickPrice';
import { Reassurance } from '../components/Reassurance';
import { VisitPanel } from '../components/VisitPanel';
import { useCatalog } from '../catalog';
import { Service, services } from '../content/services';
import { serviceImages } from '../content/serviceImages';
import { cedis, deptHref, greetingLink } from '../lib/format';
import { minPriceIn } from '../lib/priceHints';
import { useMaterials } from '../lib/useMaterials';
import { useTitle } from '../lib/useTitle';
import { site } from '../site';
import '../styles/pages/home.css';
import '../styles/pages/home-quiet.css';

const LEDE = 'Banners, shirts, stickers and mugs, made in Accra. See your price before you pay.';

/** "From GH₵85" for whole cedis, "From GH₵2.60" for print rates. */
const wholeCedis = (value: number) => (Number.isInteger(value) ? `GH₵${value.toLocaleString('en-GH')}` : cedis(value));

function Hero() {
  return (
    <section className="hero" aria-labelledby="home-title">
      <div className="container hero-inner">
        <h1 className="hero-title words" id="home-title">
          <span className="hero-line">
            <Words text="Printing that" />
            <span className="v-toggle" aria-hidden="true">
              <span />
            </span>
          </span>
          <span className="hero-line">
            <Words text="makes brands" start={2} />
          </span>
          <span className="hero-line is-accent">
            <Words text="stand out." start={4} />
          </span>
        </h1>

        <div className="hero-objects" aria-hidden="true">
          <div className="hero-fan">
            <span className="hero-tray-back" />
            <span className="hero-cards">
              <span className="vcard v1">
                <TypeCardArt />
              </span>
              <span className="vcard v2">
                <BrandCardArt />
              </span>
              <span className="vcard v3">
                <PrinterCardArt />
              </span>
              <span className="vcard v4">
                <ShirtCardArt />
              </span>
            </span>
            <span className="hero-tray" />
            <span className="hero-cursor">
              <MousePointer2 />
            </span>
          </div>
          <span className="fl fl-swatch">
            <SwatchFanArt />
          </span>
          <span className="fl fl-shirt">
            <ShirtArt />
          </span>
          <span className="fl fl-sticker">
            <StickerArt />
          </span>
          <div className="hero-tiles">
            <span className="tile tile-dark">
              <InkDropsArt />
            </span>
            <span className="tile tile-glass">
              <TagArt />
            </span>
            <span className="tile tile-blue">
              <MugArt />
            </span>
          </div>
        </div>

        <p className="hero-lede">{LEDE}</p>
        <Link className="btn-tactile" to="/print" viewTransition>
          Get a price
        </Link>
      </div>
    </section>
  );
}

/** A card photo: two sizes so phones download the light one. */
function ServicePhoto({ image }: { image: (typeof serviceImages)[string] }) {
  return (
    <img
      src={image.lg}
      srcSet={`${image.sm} 720w, ${image.lg} 1400w`}
      sizes="(min-width: 1200px) 45vw, (min-width: 720px) 50vw, 100vw"
      alt={image.alt}
      width={image.width}
      height={image.height}
      loading="lazy"
      decoding="async"
      style={{ objectPosition: image.position }}
    />
  );
}

const serviceIcon: Record<string, ComponentType> = {
  gifts: Coffee,
  events: Presentation,
};

function ServiceTile({ service }: { service: Service }) {
  const { products, departments, loading } = useCatalog();
  const image = serviceImages[service.id];
  const Icon = serviceIcon[service.id] ?? Package;

  let to = '/shop';
  let hint: string | null = null;
  let pending = false;

  if (service.kind === 'print') {
    to = `/print?need=${service.outcome}`;
    // Print jobs are priced by size; no per-sq-ft rate is shown.
    pending = false;
  } else {
    const department = departments.find((item) => service.departments.includes(item.name));
    if (department) to = deptHref(department.slug);
    const price = minPriceIn(products, service.departments);
    hint = price === null ? null : `From ${wholeCedis(price)}`;
    pending = loading;
  }

  const copy = (
    <span className="service-copy">
      <span className="service-label">{service.label}</span>
      <span className="service-blurb">{service.blurb}</span>
      {pending ? (
        <span className="skeleton service-skeleton" aria-hidden="true" />
      ) : (
        hint && <span className="service-hint">{hint}</span>
      )}
    </span>
  );

  if (service.feature) {
    return (
      <Link className="service is-feature" to={to} viewTransition>
        {copy}
        <span className="service-go" aria-hidden="true">
          <ArrowUpRight />
        </span>
        <span className="service-photo">
          <ServicePhoto image={image} />
        </span>
      </Link>
    );
  }

  return (
    <Link className="service is-compact" to={to} viewTransition>
      <span className="service-rail" aria-hidden="true">
        <span className="service-icon">
          <Icon />
        </span>
        <span className="service-go">
          <ArrowUpRight />
        </span>
      </span>
      {copy}
      <span className="service-thumb">
        <ServicePhoto image={image} />
      </span>
    </Link>
  );
}

export default function Home() {
  useTitle(`${site.fullName} | Printing and branding in Accra`);
  const { products } = useCatalog();
  const { materials } = useMaterials();

  const featured = [...products]
    .filter((product) => product.availability !== 'out')
    .sort((a, b) => Number(b.featured) - Number(a.featured))
    .slice(0, 8);

  const designFrom = materials.length
    ? Math.round(Math.min(...materials.map((material) => material.designMinimumPesewas)) / 100)
    : null;

  const steps = [
    {
      art: SizeStepArt,
      title: 'Pick it and size it',
      text: 'Choose what you need. The price changes as you change the size or quantity.',
    },
    {
      art: ArtworkStepArt,
      title: 'Send your artwork',
      text: `Upload a file or share a link. No design yet? Our designers can make one${designFrom ? `, from ${wholeCedis(designFrom)}` : ''}.`,
    },
    { art: PayStepArt, title: 'Pay with Mobile Money', text: 'We check your file and print it. Collect it at the workshop or we deliver.' },
  ];

  return (
    <AppShell>
      <div className="home-quiet">
      <Hero />

      <section className="band on-dark home-services" aria-labelledby="services-title">
        <div className="container">
          <div className="services-panel">
            <header className="services-head">
              <h2 className="title-poster" id="services-title">
                What are we <span className="accent">printing?</span>
              </h2>
              <p>Pick a job, choose a size and see your price before you pay.</p>
            </header>
            <ul className="services">
              {services.map((service) => (
                <li
                  key={service.id}
                  className={service.feature ? 'service-item is-feature' : 'service-item is-compact'}
                  data-reveal="pop"
                >
                  <ServiceTile service={service} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <QuickPrice />

      <section className="band on-dark home-how" aria-labelledby="how-title">
        <div className="container how-grid">
          <div className="how-intro" data-reveal="">
            <h2 id="how-title">
              How ordering <span className="how-accent">works</span>.
            </h2>
            <p>Size it, send the artwork, pay when it's ready. That's the whole order, start to finish.</p>
            <div className="how-art-card">
              <span className="how-art" aria-hidden="true">
                <OrderingArt />
              </span>
            </div>
          </div>

          <div className="how-body">
            {/* A true circular arc, drawn 1:1 with real pixels — the viewBox
                is sized to the column's actual rendered height (measured,
                not guessed), so there is no non-uniform stretch bending the
                circle out of shape near the ends. Phones and desktop have
                different real heights, so each gets its own arc; each one is
                still a single genuine circle (extend it and it closes into
                one), just calibrated to its own height. If the copy here
                changes enough to shift these heights a lot, these two arcs
                should be recalibrated the same way. */}
            <svg className="how-rail is-tight" viewBox="0 0 120 1182" aria-hidden="true">
              <path
                d="M12,0 A2223,2223 0 0,1 12,1182"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <svg className="how-rail is-wide" viewBox="0 0 180 648" aria-hidden="true">
              <path
                d="M16,0 A444.9,444.9 0 0,1 16,648"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <ol className="how-steps">
              {steps.map((step, index) => (
                <li key={step.title} className={`how-step how-step-${index + 1}`} data-reveal="pop">
                  <span className="how-num" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="how-copy">
                    <strong>{step.title}</strong>
                    <span>{step.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="container section home-featured" aria-labelledby="featured-title">
        <div className="section-head is-plain">
          <h2 id="featured-title">
            Ready to <span className="section-head-accent">order</span>
          </h2>
          <Link className="text-link" to="/shop" viewTransition>
            See all
          </Link>
        </div>
        <ProductGrid products={featured} skeletons={4} empty={null} variant="feature" />
      </section>

      <OurWork />

      <Reassurance />

      <div className="container home-quick">
        <Link className="quick" to="/track-order" viewTransition data-reveal="">
          <span className="quick-icon" aria-hidden="true">
            <Package />
          </span>
          <span>
            <b>Track an order</b>
            <small>Order number and email, that is all</small>
          </span>
        </Link>
        <a className="quick" href={greetingLink} target="_blank" rel="noreferrer" data-reveal="">
          <span className="quick-icon is-wa" aria-hidden="true">
            <MessageCircle />
          </span>
          <span>
            <b>Chat on WhatsApp</b>
            <small>{site.whatsappDisplay}, we reply in working hours</small>
          </span>
        </a>
      </div>

      <section className="container section home-visit" aria-labelledby="visit-title">
        <div data-reveal="">
          <VisitPanel />
        </div>
      </section>
      </div>
    </AppShell>
  );
}
