import React from 'react';
import { Ban, Check, PauseCircle } from 'lucide-react';
import { STAGES, progressFor } from '../lib/progress';

/** The four logo dots, pulsing in turn. Used wherever we wait on the API. */
export function Loader({ label = 'Loading' }: { label?: string }) {
  return (
    <span className="loader" role="status" aria-label={label}>
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

export function PageLoader() {
  return (
    <div className="page-loader">
      <Loader />
    </div>
  );
}

/**
 * An order's progress as the four logo dots: Paid, Artwork, Printing, Ready.
 * Done dots fill with their colour, the current one glows, the rest wait.
 */
export function OrderProgress({ status }: { status: string }) {
  const { lit, current, halted } = progressFor(status);

  if (halted) {
    const Icon = halted === 'cancelled' ? Ban : PauseCircle;
    return (
      <p className="progress-halted">
        <Icon aria-hidden="true" />
        {halted === 'cancelled'
          ? 'This order was cancelled. Message us if that is a surprise.'
          : 'This order is paused while we sort something out with you.'}
      </p>
    );
  }

  return (
    <ol className="progress" aria-label="Order progress">
      {STAGES.map((stage, index) => {
        const done = index < lit;
        const now = current === index;
        const reached = done || now;
        const previous = STAGES[index - 1];
        return (
          <li
            key={stage.key}
            className={`progress-step${done ? ' is-done' : ''}${now ? ' is-current' : ''}`}
            aria-current={now ? 'step' : undefined}
            style={
              {
                '--dot': stage.color,
                '--seg': reached && previous ? previous.color : undefined,
                '--i': index,
              } as React.CSSProperties
            }
          >
            <span className="progress-dot">{done && <Check strokeWidth={3} aria-hidden="true" />}</span>
            <span className="progress-label">
              {stage.label}
              <span className="visually-hidden">{done ? ', done' : now ? ', in progress' : ', not yet'}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
