import { Link } from 'react-router-dom';
import { FileCheck2, MapPin, MessageCircle, Smartphone } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Photo } from '../components/Photo';
import { VisitPanel } from '../components/VisitPanel';
import { photos, PhotoKey } from '../content/photos';
import { useTitle } from '../lib/useTitle';
import { site } from '../site';
import '../styles/pages/content.css';

const made: PhotoKey[] = ['signs', 'shirts', 'embroidery', 'mugs', 'stickers', 'caps'];

export default function About() {
  useTitle(`About | ${site.fullName}`);

  return (
    <AppShell title="About" back="/">
      <div className="container content">
        <header className="page-intro">
          <h1 className="title">About Vikipat</h1>
          <p>
            {site.fullName} is a printing and branding workshop on {site.address.line1} in Accra. We print banners,
            signs, stickers and labels, brand shirts, polos and caps with DTF and embroidery, and make mugs, gifts and
            packaging for businesses, schools, churches, events and families.
          </p>
        </header>

        <ul className="about-grid" aria-label="Some of what we make">
          {made.map((key) => (
            <li key={key}>
              <span className="about-photo">
                <Photo name={key} />
              </span>
              <span className="about-caption">{photos[key].caption}</span>
            </li>
          ))}
        </ul>

        <section className="section" aria-labelledby="how-we-work">
          <h2 className="title" id="how-we-work">
            How we work
          </h2>
          <ul className="facts about-facts">
            <li>
              <FileCheck2 aria-hidden="true" />
              <span>
                <strong>You approve before we print.</strong> For custom and branded work we send a proof first.
              </span>
            </li>
            <li>
              <Smartphone aria-hidden="true" />
              <span>
                <strong>Clear prices.</strong> Print jobs are priced by size, so you see the total before you pay with
                Mobile Money.
              </span>
            </li>
            <li>
              <MapPin aria-hidden="true" />
              <span>
                <strong>Pickup or delivery.</strong> Collect at the workshop for free, or we deliver across Ghana.
              </span>
            </li>
            <li>
              <MessageCircle aria-hidden="true" />
              <span>
                <strong>Real people on WhatsApp.</strong> Ask us anything about your job on {site.whatsappDisplay}.
              </span>
            </li>
          </ul>
        </section>

        <section className="content-cta">
          <h2 className="heading">Printing for a team, school or event?</h2>
          <p>Send us the item, how many you need and your deadline, and we will quote you.</p>
          <div className="content-cta-actions">
            <Link className="btn btn-primary" to="/contact">
              Ask for a quote
            </Link>
          </div>
        </section>

        <section className="section" aria-labelledby="visit-title">
          <VisitPanel />
        </section>
      </div>
    </AppShell>
  );
}
