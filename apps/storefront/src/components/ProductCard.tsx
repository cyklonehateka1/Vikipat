import { Link } from 'react-router-dom';
import { Check, Plus } from 'lucide-react';
import { Product, productImage } from '../catalog';
import { useOrder } from '../order';
import { Price, StockBadge } from './Primitives';

/**
 * One product in a grid. The name carries a full-card link, so the whole cell
 * is clickable while the add control stays a separate, real button.
 */
export function ProductCard({ product, reveal = true }: { product: Product; reveal?: boolean }) {
  const { add, qtyOf, openDrawer } = useOrder();
  const inList = qtyOf(product.id);
  const soldOut = product.availability === 'out';

  return (
    <article className={`card${reveal ? ' reveal' : ''}`}>
      <Link className="card-media" to={`/product/${product.id}`} tabIndex={-1} aria-hidden="true">
        <img src={productImage(product)} alt={product.name} loading="lazy" width={600} height={600} />
        {(product.featured || soldOut) && (
          <div className="card-flags">
            {soldOut ? (
              <span className="badge badge-out">Out of stock</span>
            ) : (
              <span className="badge badge-featured">Featured</span>
            )}
          </div>
        )}
      </Link>

      <div className="card-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <p className="card-dept">{product.department}</p>
          <span className="label-micro" style={{ color: 'var(--ink-faint)', fontSize: '0.65rem' }}>{product.ref}</span>
        </div>
        
        <h3 className="card-name">
          <Link to={`/product/${product.id}`}>{product.name}</Link>
        </h3>
        
        <div className="card-foot">
          <div>
            <Price value={product.price} />
            <span className="price-unit" style={{ display: 'block', marginTop: 2 }}>
              per {product.unit}
            </span>
          </div>
          {!soldOut && <StockBadge value={product.availability} />}
        </div>
      </div>

      {soldOut ? (
        <button className="btn btn-sm card-add" disabled>
          Out of stock
        </button>
      ) : inList ? (
        <button className="btn btn-sm card-add card-added" onClick={openDrawer}>
          <Check aria-hidden="true" />
          In your list ({inList})
        </button>
      ) : (
        <button
          className="btn btn-sm card-add"
          onClick={() => add(product)}
          aria-label={`Add ${product.name} to your order list`}
        >
          <Plus aria-hidden="true" />
          Add to quote list
        </button>
      )}
    </article>
  );
}
