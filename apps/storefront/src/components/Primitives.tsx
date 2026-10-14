import { useEffect, useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { Product } from '../catalog';
import { cedis } from '../lib/format';

/** A price in cedis with fixed-width figures, e.g. GH₵85.00. */
export function Price({ value, className = '' }: { value: number; className?: string }) {
  return <span className={`price ${className}`.trim()}>{cedis(value)}</span>;
}

/** Stock in words, with the count when it is running low. */
export function StockNote({ product }: { product: Product }) {
  if (product.availability === 'out') return <span className="stock-note is-out">Sold out</span>;
  if (product.availability === 'low')
    return <span className="stock-note is-low">Only {product.stockCount} left</span>;
  return (
    <span className="stock-note is-in">
      <Check strokeWidth={2.6} aria-hidden="true" />
      In stock
    </span>
  );
}

/**
 * Quantity control. The buttons report a delta (two quick taps in one React
 * batch both count), and the number itself can be typed for bulk orders.
 */
export function Stepper({
  value,
  onStep,
  onSet,
  min = 1,
  max = 999,
  label,
  small,
}: {
  value: number;
  onStep: (delta: number) => void;
  onSet: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  small?: boolean;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const next = Math.round(Number(draft));
    if (draft.trim() && Number.isFinite(next) && next >= min) onSet(Math.min(max, next));
    else setDraft(String(value));
  };

  return (
    <div className={`stepper${small ? ' stepper-sm' : ''}`} role="group" aria-label={`Quantity of ${label}`}>
      <button type="button" onClick={() => onStep(-1)} disabled={value <= min} aria-label={`One fewer ${label}`}>
        <Minus strokeWidth={2.4} aria-hidden="true" />
      </button>
      <input
        className="stepper-value"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft}
        aria-label={`Quantity of ${label}`}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
      <button type="button" onClick={() => onStep(1)} disabled={value >= max} aria-label={`One more ${label}`}>
        <Plus strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>
  );
}
