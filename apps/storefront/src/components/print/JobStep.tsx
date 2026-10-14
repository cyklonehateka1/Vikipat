import { Link } from 'react-router-dom';
import { Car, Image, MessageCircle, Presentation, RefreshCw, Sticker, Store } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { OUTCOMES } from '../../outcomes';
import { PrintMaterial } from '../../types/pricing';
import { greetingLink } from '../../lib/format';
import { StatusPanel } from '../ProductGrid';

/** One small icon per job, each in its own colour, like the reference list. */
const JOB_ICON: Record<string, { icon: LucideIcon }> = {
  'shop-signage': { icon: Store },
  'events-backdrops': { icon: Presentation },
  'vehicle-glass': { icon: Car },
  'stickers-labels': { icon: Sticker },
  'indoor-decor': { icon: Image },
};

/** Step one: say what you are making. Each job suggests a material and size. */
export function JobStep({
  materials,
  loading,
  error,
  retry,
  onPickOutcome,
  onBrowseMaterials,
}: {
  materials: PrintMaterial[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  onPickOutcome: (slug: string) => void;
  onBrowseMaterials: () => void;
}) {
  return (
    <div className="container print-step print-flow">
      <header className="print-head">
        <h1>What are we printing?</h1>
        <p>Pick the job that fits best. We suggest a material and a starting size.</p>
      </header>

      {error ? (
        <StatusPanel
          kind="error"
          title="We couldn't load print prices"
          note="Check your connection and try again, or send us the details on WhatsApp."
        >
          <button type="button" className="btn btn-primary" onClick={retry}>
            <RefreshCw aria-hidden="true" />
            Try again
          </button>
          <a className="btn btn-secondary" href={greetingLink} target="_blank" rel="noreferrer">
            <MessageCircle className="wa" aria-hidden="true" />
            WhatsApp us
          </a>
        </StatusPanel>
      ) : (
        <>
          <ul className="opt-list">
            {OUTCOMES.map((outcome) => {
              const meta = JOB_ICON[outcome.slug] ?? { icon: Image };
              const Icon = meta.icon;
              return (
                <li key={outcome.slug}>
                  <button type="button" className="opt" onClick={() => onPickOutcome(outcome.slug)}>
                    <span className="opt-icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="opt-body">
                      <span className="opt-title">{outcome.label}</span>
                      <span className="opt-note">{outcome.blurb}</span>
                    </span>
                    <span className="opt-radio" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="print-job-more">
            <button type="button" className="btn btn-secondary" onClick={onBrowseMaterials} disabled={loading}>
              I know the material I want
            </button>
            <Link className="text-link" to="/contact">
              Something else? Ask for a quote
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
