import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, HelpCircle, MessageCircle, Plus } from 'lucide-react';
import { Layout, PageHead } from '../components/Layout';
import { Crumbs } from '../components/Primitives';
import { faqs } from '../data';
import { site } from '../site';
import { slugify, whatsappLink } from '../lib/format';
import { useTitle } from '../lib/useReveal';

export default function Faq() {
  useTitle(`Ordering, Artwork & Production Guide | ${site.fullName}`);
  const [open, setOpen] = useState<string | null>(faqs[0].code);

  const groups = Array.from(new Set(faqs.map((item) => item.group)));

  return (
    <Layout>
      <PageHead
        title="Ordering, Artwork &amp; Production Guide"
        lede="Everything you need to know about our printing processes, file preparation, turnaround times, and delivery across Ghana. Have a unique inquiry? Speak directly with our team."
      >
        <Crumbs trail={[{ label: 'Home', to: '/' }, { label: 'Ordering Guide & FAQ' }]} />
      </PageHead>

      <section className="shell section-tight">
        <div className="faq-layout">
          <nav className="faq-index" aria-label="Question categories">
            <p className="label-micro" style={{ color: 'var(--brand-primary)' }}>FAQ Topics</p>
            {groups.map((group) => (
              <a key={group} href={`#${slugify(group)}`}>
                <span>{group}</span>
                <ChevronRight aria-hidden="true" style={{ width: 14, height: 14 }} />
              </a>
            ))}
          </nav>

          <div>
            {groups.map((group) => (
              <div className="faq-group" key={group}>
                <h2 className="h2" id={slugify(group)}>
                  {group}
                </h2>
                <div style={{ marginTop: '12px' }}>
                  {faqs
                    .filter((item) => item.group === group)
                    .map((item) => {
                      const expanded = open === item.code;
                      return (
                        <div className="qa" key={item.code}>
                          <h3>
                            <button
                              className="qa-trigger"
                              aria-expanded={expanded}
                              aria-controls={`answer-${item.code}`}
                              id={`question-${item.code}`}
                              onClick={() => setOpen(expanded ? null : item.code)}
                            >
                              <span className="qa-code">#{item.code}</span>
                              <span className="qa-q">{item.question}</span>
                              <span className="qa-sign" aria-hidden="true">
                                <Plus strokeWidth={2} style={{ width: 18, height: 18 }} />
                              </span>
                            </button>
                          </h3>
                          <div
                            className={`qa-panel${expanded ? ' is-open' : ''}`}
                            id={`answer-${item.code}`}
                            role="region"
                            aria-labelledby={`question-${item.code}`}
                          >
                            <p>{item.answer}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}

            <div className="state" style={{ marginTop: 'var(--s8)' }}>
              <HelpCircle aria-hidden="true" />
              <h2 className="h3">Have a specific question not covered here?</h2>
              <p>
                Our production team is readily available to answer technical print questions, inspect file formats, or advise on materials.
              </p>
              <div className="state-actions">
                <a
                  className="btn btn-whatsapp btn-lg"
                  href={whatsappLink(
                    `Hello ${site.name}, I have a question about file preparation or print production.`,
                  )}
                >
                  <MessageCircle aria-hidden="true" />
                  <span>Ask on WhatsApp</span>
                </a>
                <Link className="btn btn-secondary btn-lg" to="/contact">
                  Send Project Brief
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
