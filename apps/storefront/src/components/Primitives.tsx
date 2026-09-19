import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Minus, Plus } from 'lucide-react';
import { Availability, availabilityLabel } from '../catalog';
import { amount } from '../lib/format';

/** Small mono label used for eyebrows, data keys and codes. */
export function Label({
  children,
  micro,
  className = '',
  as: Tag = 'p',
}: {
  children: React.ReactNode;
  micro?: boolean;
  className?: string;
  as?: 'p' | 'span' | 'dt' | 'div' | 'h2';
}) {
  return (
    <Tag className={`${micro ? 'label-micro' : 'label'} ${className}`.trim()}>{children}</Tag>
  );
}

/** Price with a subordinate currency mark and tabular figures. */
export function Price({ value, large }: { value: number; large?: boolean }) {
  return (
    <span className={`price${large ? ' price-lg' : ''}`}>
      <span className="cur">GH₵</span>
      {amount(value)}
    </span>
  );
}

const badgeClass: Record<Availability, string> = {
  in: 'badge badge-stock',
  low: 'badge badge-low',
  out: 'badge badge-out',
};

export function StockBadge({ value }: { value: Availability }) {
  return <span className={badgeClass[value]}>{availabilityLabel[value]}</span>;
}

/** Ruled section head: title, optional note and a trailing action. */
export function SectionHead({
  eyebrow,
  title,
  note,
  action,
  id,
  light,
}: {
  eyebrow?: string;
  title: string;
  note?: string;
  action?: React.ReactNode;
  id?: string;
  /** Set on dark grounds, where the head sits on its own rule. */
  light?: boolean;
}) {
  return (
    <div className={light ? 'how-head' : 'head'}>
      <div className="head-body">
        {eyebrow && <Label micro>{eyebrow}</Label>}
        <h2 className="h2" id={id}>
          {title}
        </h2>
        {note && <p>{note}</p>}
      </div>
      {action && <div className="head-action">{action}</div>}
    </div>
  );
}

export type Crumb = { label: string; to?: string };

export function Crumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav className="crumbs label-micro" aria-label="Breadcrumb">
      {trail.map((crumb, index) => (
        <React.Fragment key={crumb.label}>
          {index > 0 && <ChevronRight aria-hidden="true" />}
          {crumb.to ? (
            <Link to={crumb.to}>{crumb.label}</Link>
          ) : (
            <span aria-current="page">{crumb.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

/**
 * Reports a delta rather than a computed next value. Two clicks landing in one
 * React batch would both read the same `value` prop and both write the same
 * number, silently dropping an increment; a delta lets the owner apply it
 * functionally against whatever the current quantity really is.
 */
export function Stepper({
  value,
  onStep,
  min = 1,
  max = 99,
  label,
  small,
}: {
  value: number;
  onStep: (delta: number) => void;
  min?: number;
  max?: number;
  label: string;
  small?: boolean;
}) {
  return (
    <div className={`stepper${small ? ' stepper-sm' : ''}`}>
      <button
        type="button"
        onClick={() => onStep(-1)}
        disabled={value <= min}
        aria-label={`Reduce quantity of ${label}`}
      >
        <Minus aria-hidden="true" />
      </button>
      <span className="stepper-value" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onStep(1)}
        disabled={value >= max}
        aria-label={`Increase quantity of ${label}`}
      >
        <Plus aria-hidden="true" />
      </button>
    </div>
  );
}

/** Placeholder cards shown while the catalogue is in flight. */
export function CardSkeletons({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-products" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="card-skeleton" key={index}>
          <div className="skeleton sk-media" />
          <div className="skeleton sk-line" style={{ width: '40%' }} />
          <div className="skeleton sk-line" style={{ width: '85%' }} />
          <div className="skeleton sk-line" style={{ width: '55%' }} />
        </div>
      ))}
    </div>
  );
}
