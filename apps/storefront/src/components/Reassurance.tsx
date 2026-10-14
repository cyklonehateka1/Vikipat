import { CreditCard, Eye, MapPinned, Truck } from 'lucide-react';
import { site } from '../site';

/**
 * A short row of facts that remove "will this go wrong?" right before the
 * visitor commits. After the reference: tilted cards on a plain ground,
 * connected by a dashed line, each with a small floating icon over a tinted
 * panel. Content only states what site.ts and the order-stage docs confirm —
 * no invented delivery-fee or proof-for-every-job claims.
 */
const points = [
  {
    icon: CreditCard,
    title: 'Pay by Mobile Money',
    text: `${site.payment}.`,
  },
  {
    icon: Truck,
    title: 'Pickup or delivery',
    text: `Collect it at the workshop, or we deliver across ${site.deliveryArea}.`,
  },
  {
    icon: Eye,
    title: "See it before it prints",
    text: "For jobs that need one, we send a proof first. Nothing prints until you're happy with it.",
  },
  {
    icon: MapPinned,
    title: 'Track your order',
    text: 'From placed to ready for collection, one page shows where your job is.',
  },
];

export function Reassurance() {
  return (
    <section className="section home-reassure" aria-labelledby="reassure-title">
      <div className="container">
        <header className="reassure-head" data-reveal="">
          <h2 id="reassure-title">
            Ordering here is <span className="accent">straightforward</span>
          </h2>
          <p>No surprises between choosing a job and collecting it.</p>
        </header>

        <ul className="reassure-list">
          {points.map((point, index) => (
            <li key={point.title} className="reassure-item" data-reveal="pop">
              <span className="reassure-card">
                <span className="reassure-icon">
                  <point.icon aria-hidden="true" />
                </span>
                <strong>{point.title}</strong>
                <span>{point.text}</span>
              </span>
              {index < points.length - 1 && <span className="reassure-link" aria-hidden="true" />}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
