import React from 'react';
import { Link } from 'react-router-dom';
import { PackageSearch, RefreshCw } from 'lucide-react';
import { Product, useCatalog } from '../catalog';
import { ProductCard } from './ProductCard';
import { CardSkeletons } from './Primitives';

/**
 * Every listing on the site renders through here, so loading, failure and
 * empty results look and behave the same wherever you meet them.
 */
export function ProductGrid({
  products,
  empty,
  skeletons = 8,
}: {
  products: Product[];
  /** Shown when the fetch succeeded but nothing matched. */
  empty: React.ReactNode;
  skeletons?: number;
}) {
  const { loading, error, retry } = useCatalog();

  if (loading) return <CardSkeletons count={skeletons} />;

  if (error) {
    return (
      <div className="state">
        <PackageSearch aria-hidden="true" />
        <h2 className="h3">We could not load the shop</h2>
        <p>{error}</p>
        <div className="state-actions">
          <button className="btn btn-primary" onClick={retry}>
            <RefreshCw aria-hidden="true" /> Try again
          </button>
          <Link className="btn" to="/contact">
            Contact us
          </Link>
        </div>
      </div>
    );
  }

  if (!products.length) return <>{empty}</>;

  return (
    <div className="grid grid-products">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

/** The standard "nothing matched" panel, with a way back out. */
export function NoResults({
  title = 'Nothing matches that yet',
  note = 'Try a broader search, or clear the filters to see everything we hold. If you are after something we do not list, ask us directly.',
  onClear,
}: {
  title?: string;
  note?: string;
  onClear?: () => void;
}) {
  return (
    <div className="state">
      <PackageSearch aria-hidden="true" />
      <h2 className="h3">{title}</h2>
      <p>{note}</p>
      <div className="state-actions">
        {onClear && (
          <button className="btn btn-primary" onClick={onClear}>
            Clear filters
          </button>
        )}
        <Link className="btn" to="/shop">
          Browse everything
        </Link>
        <Link className="btn" to="/contact">
          Ask us
        </Link>
      </div>
    </div>
  );
}
