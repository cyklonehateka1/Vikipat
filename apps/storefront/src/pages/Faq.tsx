import { Link } from 'react-router-dom';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { faqs } from '../data';
import { greetingLink, slugify } from '../lib/format';
import { useTitle } from '../lib/useTitle';
import { site } from '../site';
import '../styles/pages/content.css';

export default function Faq() {
  useTitle(`Help and FAQ | ${site.fullName}`);
  const groups = Array.from(new Set(faqs.map((faq) => faq.group)));

  return (
    <AppShell title="Help" back="/">
      <div className="container content">
        <header className="page-intro">
          <h1 className="title">Help and FAQ</h1>
          <p>Quick answers about ordering, artwork, payment and delivery.</p>
        </header>

        {groups.map((group) => (
          <section className="faq-group" key={group} aria-labelledby={`faq-${slugify(group)}`}>
            <h2 className="heading" id={`faq-${slugify(group)}`}>
              {group}
            </h2>
            <div className="faq-list">
              {faqs
                .filter((faq) => faq.group === group)
                .map((faq) => (
                  <details className="faq" key={faq.question}>
                    <summary>
                      {faq.question}
                      <ChevronDown aria-hidden="true" />
                    </summary>
                    <p>{faq.answer}</p>
                  </details>
                ))}
            </div>
          </section>
        ))}

        <section className="content-cta">
          <h2 className="heading">Still have a question?</h2>
          <p>Message us. We usually reply within working hours.</p>
          <div className="content-cta-actions">
            <a className="btn btn-primary" href={greetingLink} target="_blank" rel="noreferrer">
              <MessageCircle aria-hidden="true" />
              Chat on WhatsApp
            </a>
            <Link className="btn btn-secondary" to="/contact">
              Other ways to reach us
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
