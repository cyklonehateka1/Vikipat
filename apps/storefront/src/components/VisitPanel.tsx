import { ArrowUpRight, Clock, MapPin, MessageCircle, Phone } from 'lucide-react';
import { greetingLink, mapsLink, telLink } from '../lib/format';
import { site } from '../site';

const MAP_EMBED_SRC =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d71228.64229777285!2d-0.33459973046875396!3d5.576663300000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xfdfa3930489ef5b%3A0x2fede7873e8cfef9!2sVikipat%20Media%20Solutions!5e1!3m2!1sen!2sgh!4v1790560054977!5m2!1sen!2sgh';

/** Address, hours and the three ways to reach the workshop, beside a map. */
export function VisitPanel({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const ways = [
    { href: telLink, icon: Phone, title: 'Call us', detail: site.phoneDisplay, external: false },
    { href: greetingLink, icon: MessageCircle, title: 'Chat on WhatsApp', detail: site.whatsappDisplay, external: true },
    {
      href: mapsLink,
      icon: MapPin,
      title: 'Get directions',
      detail: `${site.address.line1}, ${site.address.line2}`,
      external: true,
    },
  ];

  return (
    <div className="visit">
      <div className="visit-body">
        <header className="visit-head">
          <Heading id="visit-title">Visit the workshop</Heading>
          <p>Come in, call or send a message. We are happy to talk through your job.</p>
        </header>

        <ul className="visit-ways">
          {ways.map(({ href, icon: Icon, title, detail, external }) => (
            <li key={title}>
              <a
                className="visit-way"
                href={href}
                {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
              >
                <span className="visit-way-icon" aria-hidden="true">
                  <Icon className={Icon === MessageCircle ? 'wa' : undefined} />
                </span>
                <span className="visit-way-body">
                  <b>{title}</b>
                  <span>{detail}</span>
                </span>
                <ArrowUpRight className="visit-way-arrow" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>

        <section className="visit-hours-card" aria-label="Opening hours">
          <p className="visit-hours-title">
            <Clock aria-hidden="true" />
            Opening hours
          </p>
          <dl className="visit-hours">
            {site.hours.map((row) => (
              <div key={row.days}>
                <dt>{row.days}</dt>
                <dd>{row.time}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <span className="visit-media">
        <iframe
          src={MAP_EMBED_SRC}
          title="Map to the Vikipat workshop"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </span>
    </div>
  );
}
