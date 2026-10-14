import { Link, useViewTransitionState } from 'react-router-dom';
import { Check, Plus } from 'lucide-react';
import { Product, productImage } from '../catalog';
import { useOrder } from '../order';
import { perUnit } from '../lib/format';
import { useBurst } from './Motion';
import { Price } from './Primitives';
import { useToast } from './Toast';

/**
 * One product in a grid. The name is the card's link (stretched over the whole
 * card), and the add button stays a separate real button above it. The photo
 * carries a shared transition name while the page opens, so it morphs into the
 * product page's photo.
 */
export function ProductCard({ product, variant }: { product: Product; variant?: 'feature' }) {
  const { add, qtyOf } = useOrder();
  const { show } = useToast();
  const burst = useBurst();
  const to = `/product/${product.id}`;
  const opening = useViewTransitionState(to);
  const inCart = qtyOf(product.id);
  const soldOut = product.availability === 'out';
  const isFeature = variant === 'feature';

  const addButton = soldOut ? null : inCart ? (
    <Link
      className={`product-card-add is-in${isFeature ? ' is-feature' : ''}`}
      to="/cart"
      viewTransition
      aria-label={`${product.name}: ${inCart} in your cart. View cart`}
    >
      <Check strokeWidth={2.6} aria-hidden="true" />
      {isFeature ? 'In cart' : inCart}
    </Link>
  ) : (
    <button
      type="button"
      className={`product-card-add${isFeature ? ' is-feature' : ''}`}
      aria-label={`Add ${product.name} to cart`}
      onClick={() => {
        burst.fire();
        add(product);
        show(`${product.name} is in your cart`, { label: 'View cart', to: '/cart' });
      }}
    >
      <Plus strokeWidth={2.4} aria-hidden="true" />
      {isFeature ? 'Add to cart' : null}
      {burst.node}
    </button>
  );

  return (
    <article className={`product-card${soldOut ? ' is-sold-out' : ''}${isFeature ? ' is-feature' : ''}`}>
      <div className="product-card-media">
        <span className="product-card-photo">
          <img
            src={productImage(product)}
            alt=""
            loading="lazy"
            decoding="async"
            width={400}
            height={400}
            style={opening ? { viewTransitionName: 'product-image' } : undefined}
          />
        </span>
        {soldOut ? (
          <span className="product-card-flag">Sold out</span>
        ) : product.availability === 'low' ? (
          <span className="product-card-flag">Only {product.stockCount} left</span>
        ) : null}
        {isFeature ? null : addButton}
      </div>
      <div className="product-card-body">
        {isFeature && <span className="product-card-dept">{product.department}</span>}
        <Link className="product-card-name" to={to} viewTransition>
          {product.name}
        </Link>
        <span className="product-card-foot">
          <span className="product-card-price">
            <Price value={product.price} />
            <span className="price-unit">{perUnit(product.unit)}</span>
          </span>
          {isFeature && addButton}
        </span>
      </div>
    </article>
  );
}
