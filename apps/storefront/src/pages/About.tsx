import { Link } from 'react-router-dom';
import { ArrowRight, Award, CheckCircle2, Layers, MessageCircle, Truck } from 'lucide-react';
import { Layout, PageHead } from '../components/Layout';
import { Crumbs, SectionHead } from '../components/Primitives';
import { site } from '../site';
import { useCatalog } from '../catalog';
import { pad, telLink, whatsappLink } from '../lib/format';
import { useReveal, useTitle } from '../lib/useReveal';

const values = [
  {
    icon: Layers,
    title: 'Color Fidelity & Print Precision',
    copy: 'We calibrate our digital presses, DTF printers and screen-printing equipment to strict CMYK standards so your corporate logo and brand colors reproduce faithfully on every medium.',
  },
  {
    icon: Award,
    title: 'Premium Substrates & Finishes',
    copy: 'From 400gsm heavyweight velvet-touch cardstock to 510gsm weatherproof banner vinyl and piqué cotton apparel, we select durable, premium materials built to impress.',
  },
  {
    icon: CheckCircle2,
    title: 'Pre-Flight Artwork Checking',
    copy: 'Every file is checked by a skilled graphic designer before production. We flag low resolutions, bleed issues, or color space shifts to guarantee immaculate output.',
  },
  {
    icon: Truck,
    title: 'Reliable Delivery Across Ghana',
    copy: 'Based on Mallam–Gbawe Road, opposite Zen Filling Station, we provide daily courier dispatch throughout Accra and trusted regional delivery across Ghana.',
  },
];

export default function About() {
  const { departments, products } = useCatalog();
  useTitle(`About Our Studio | ${site.fullName}`);
  useReveal([products.length]);

  return (
    <Layout>
      <PageHead
        title="Accra’s Premier Commercial Printing &amp; Branding Studio"
        lede={`${site.fullName} brings brands to life. We partner with ambitious companies, entrepreneurs, institutions, and creators across Ghana to deliver exceptional print craftsmanship and bespoke branded merchandise.`}
        stats={[
          { label: 'Categories', value: pad(departments.length) },
          { label: 'Active Lines', value: pad(products.length) },
        ]}
      >
        <Crumbs trail={[{ label: 'Home', to: '/' }, { label: 'About Studio' }]} />
      </PageHead>

      <section className="shell section">
        <div className="split">
          <div className="split-figure reveal">
            <img
              src="https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=86"
              alt="Designers and print specialists at work in our studio"
              width={1200}
              height={900}
            />
          </div>
          <div className="prose reveal">
            <div className="badge badge-featured" style={{ marginBottom: '12px' }}>
              <span>Our Mission</span>
            </div>
            <h2 className="h2" style={{ marginBottom: '16px' }}>
              Print Boldly. Brand Brilliantly.
            </h2>
            <p>
              Founded in Accra, Vikipat was established with a singular objective: to eliminate the friction, uncertainty, and low quality often associated with custom printing and corporate merchandise in West Africa.
            </p>
            <p>
              We combine high-speed digital presses, industrial screen-printing carousels, direct-to-film (DTF) apparel tech, and large-format UV plotters with an obsession for crisp typography, accurate alignment, and tactile finishes.
            </p>
            <p>
              Whether you need 1 personalised ceramic mug for a birthday gift or 2,000 branded polo shirts for a multinational tech conference, every single piece receives meticulous attention from our team.
            </p>
          </div>
        </div>
      </section>

      <section className="shell section-tight">
        <SectionHead
          eyebrow="Our Commitments"
          title="The Vikipat Quality Standard"
          note="These four standards guide every project that enters our production facility."
        />
        <div className="grid grid-2">
          {values.map((value) => {
            const Icon = value.icon;
            return (
              <article className="value reveal" key={value.title}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon aria-hidden="true" />
                  <h3>{value.title}</h3>
                </div>
                <p>{value.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Corporate Supply Banner */}
      <section className="shell section-tight">
        <div className="closing-banner reveal">
          <div className="closing-banner-copy">
            <p className="eyebrow">Enterprise &amp; Institutional Accounts</p>
            <h2>Corporate Procurement &amp; High-Volume Supply</h2>
            <p className="sub">
              We provide priority turnaround, dedicated account management, and tiered volume pricing for corporate offices, marketing agencies, schools, NGOs, and event planners.
            </p>
          </div>
          <div className="closing-banner-actions">
            <a
              className="btn btn-whatsapp btn-lg"
              href={whatsappLink(
                `Hello ${site.name}, I would like to enquire about a corporate print or bulk branding contract.`,
              )}
            >
              <MessageCircle aria-hidden="true" />
              <span>Discuss Corporate Account</span>
            </a>
            <a className="btn btn-primary btn-lg" href={telLink}>
              Call Studio Counter
            </a>
          </div>
        </div>
      </section>

      <section className="shell section-tight">
        <Link className="btn btn-secondary" to="/shop">
          <span>Explore All Products &amp; Pricing</span>
          <ArrowRight aria-hidden="true" style={{ width: 16, height: 16 }} />
        </Link>
      </section>
    </Layout>
  );
}
