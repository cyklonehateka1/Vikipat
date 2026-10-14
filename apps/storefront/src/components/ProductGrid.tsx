import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, PackageSearch, RefreshCw, WifiOff } from 'lucide-react';
import { Product, useCatalog } from '../catalog';
import { ProductCard } from './ProductCard';
import { greetingLink } from '../lib/format';

/** A centred message for loading failures and empty results, with a way forward. */
export function StatusPanel({
  kind = 'empty',
  title,
  note,
  children,
}: {
  kind?: 'empty' | 'error';
  title: string;
  note?: string;
  children?: React.ReactNode;
}) {
  const Icon = kind === 'error' ? WifiOff : PackageSearch;
  return (
    <div className="status-panel" role={kind === 'error' ? 'alert' : undefined}>
      <span className={`status-panel-icon${kind === 'error' ? ' is-error' : ''}`}>
        <Icon aria-hidden="true" />
      </span>
      <h2 className="status-panel-title">{title}</h2>
      {note && <p className="status-panel-note">{note}</p>}
      {children && <div className="status-panel-actions">{children}</div>}
    </div>
  );
}

/** Shown wherever the catalogue failed to load. */
export function CatalogError({ onRetry }: { onRetry: () => void }) {
  return (
    <StatusPanel
      kind="error"
      title="We couldn't load the shop"
      note="Check your connection and try again. You can still order with us on WhatsApp."
    >
      <button type="button" className="btn btn-primary" onClick={onRetry}>
        <RefreshCw aria-hidden="true" />
        Try again
      </button>
      <a className="btn btn-secondary" href={greetingLink} target="_blank" rel="noreferrer">
        <MessageCircle className="wa" aria-hidden="true" />
        WhatsApp us
      </a>
    </StatusPanel>
  );
}

export function ProductSkeletons({ count = 6 }: { count?: number }) {
  return (
    <div className="product-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="product-card product-card-skeleton" key={index}>
          <div className="skeleton skeleton-media" />
          <div className="product-card-body">
            <div className="skeleton skeleton-line" style={{ width: '85%' }} />
            <div className="skeleton skeleton-line" style={{ width: '45%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Every product listing renders through here, so loading, failure and empty
 * results look and behave the same wherever you meet them.
 */
export function ProductGrid({
  products,
  empty,
  skeletons = 6,
  variant,
}: {
  products: Product[];
  empty: React.ReactNode;
  skeletons?: number;
  variant?: 'feature';
}) {
  const { loading, error, retry } = useCatalog();

  if (loading) return <ProductSkeletons count={skeletons} />;
  if (error) return <CatalogError onRetry={retry} />;
  if (!products.length) return <>{empty}</>;

  return (
    <div className={`product-grid${variant === 'feature' ? ' is-feature' : ''}`}>
      {products.map((product) => (
        <div className="product-cell" key={product.id} data-reveal="pop">
          <ProductCard product={product} variant={variant} />
        </div>
      ))}
    </div>
  );
}

/** The standard "nothing matched" panel, with ways back out. */
export function NoResults({
  title = 'Nothing matches that yet',
  note = 'Try a shorter search or clear the filters. If you need something we do not list, ask us.',
  onClear,
}: {
  title?: string;
  note?: string;
  onClear?: () => void;
}) {
  return (
    <StatusPanel title={title} note={note}>
      {onClear && (
        <button type="button" className="btn btn-primary" onClick={onClear}>
          Clear filters
        </button>
      )}
      <Link className="btn btn-secondary" to="/contact">
        Ask for a quote
      </Link>
    </StatusPanel>
  );
}
