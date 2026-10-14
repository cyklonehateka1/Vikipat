import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, SlidersHorizontal, X } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { NoResults, ProductGrid, StatusPanel } from '../components/ProductGrid';
import { Sheet } from '../components/Sheet';
import { matches, useCatalog } from '../catalog';
import { isSort, Sort, sortProducts, sorts } from '../lib/sorting';
import { useTitle } from '../lib/useTitle';
import { site } from '../site';
import '../styles/pages/shop.css';

/**
 * One screen for the whole shop. It serves /shop, /department/:slug and
 * /search, so every older link still lands somewhere sensible.
 */
export default function Shop() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { products, departments, loading, error } = useCatalog();
  const [sortOpen, setSortOpen] = useState(false);
  // Sheet choices are a draft until the sheet closes (see Sheet's afterClose).
  const [draftSort, setDraftSort] = useState<Sort>('featured');
  const [draftStock, setDraftStock] = useState(false);

  const deptSlug = slug ?? params.get('dept') ?? '';
  const query = params.get('q') ?? '';
  const inStockOnly = params.get('stock') === 'in';
  const sortParam = params.get('sort');
  const sort: Sort = isSort(sortParam) ? sortParam : 'featured';
  const [draft, setDraft] = useState(query);

  useEffect(() => setDraft(query), [query]);

  const department = departments.find((item) => item.slug === deptSlug);
  const unknownDepartment = Boolean(deptSlug) && !loading && !error && !department;

  const visible = useMemo(() => {
    const matched = products.filter(
      (product) =>
        (!deptSlug || product.departmentSlug === deptSlug) &&
        (!inStockOnly || product.availability !== 'out') &&
        matches(product, query),
    );
    return sortProducts(matched, sort);
  }, [products, deptSlug, inStockOnly, query, sort]);

  const draftCount = useMemo(
    () =>
      products.filter(
        (product) =>
          (!deptSlug || product.departmentSlug === deptSlug) &&
          (!draftStock || product.availability !== 'out') &&
          matches(product, query),
      ).length,
    [products, deptSlug, draftStock, query],
  );

  const heading = department?.name ?? (query ? `Results for “${query}”` : 'Shop');
  useTitle(`${heading} | ${site.fullName}`);

  /** Filters live in the URL so a shared link and the Back button both work. */
  const go = (next: { dept?: string; q?: string; sort?: Sort; stock?: boolean }) => {
    const search = new URLSearchParams();
    const d = next.dept ?? deptSlug;
    const q = next.q ?? query;
    const s = next.sort ?? sort;
    const st = next.stock ?? inStockOnly;
    if (d) search.set('dept', d);
    if (q.trim()) search.set('q', q.trim());
    if (s !== 'featured') search.set('sort', s);
    if (st) search.set('stock', 'in');
    const qs = search.toString();
    if (slug || !pathname.startsWith('/shop')) navigate(`/shop${qs ? `?${qs}` : ''}`, { replace: true });
    else setParams(search, { replace: true });
  };

  const clearAll = () => navigate('/shop', { replace: true });
  const filtered = Boolean(deptSlug || query || inStockOnly);
  const sortLabel = sorts.find((option) => option.value === sort)?.label ?? 'Featured first';

  return (
    <AppShell title={heading} back={filtered ? '/shop' : undefined}>
      <div className="container shop">
        <header className="page-intro shop-intro">
          <h1 className="title">{heading}</h1>
          {department?.blurb && <p>{department.blurb}</p>}
        </header>

        <form
          className="search shop-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            go({ q: draft });
          }}
        >
          <label className="search-field">
            <SearchIcon aria-hidden="true" />
            <span className="visually-hidden">Search the shop</span>
            <input
              type="search"
              enterKeyHint="search"
              placeholder="Search shirts, mugs, labels"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            {draft && (
              <button
                type="button"
                className="icon-btn"
                aria-label="Clear search"
                onClick={() => {
                  setDraft('');
                  go({ q: '' });
                }}
              >
                <X aria-hidden="true" />
              </button>
            )}
          </label>
        </form>

        {departments.length > 0 && (
          <div className="chip-row shop-chips" role="group" aria-label="Category">
            <button type="button" className="chip" aria-pressed={!deptSlug} onClick={() => go({ dept: '' })}>
              All
            </button>
            {departments.map((item) => (
              <button
                key={item.slug}
                type="button"
                className="chip"
                aria-pressed={deptSlug === item.slug}
                onClick={() => go({ dept: item.slug })}
              >
                {item.name}
                <span className="chip-count">{item.count}</span>
              </button>
            ))}
          </div>
        )}

        {error ? (
          <ProductGrid products={[]} empty={null} />
        ) : unknownDepartment ? (
          <StatusPanel title="We don't have that category" note="It may have been renamed. Everything we sell is in the shop.">
            <Link className="btn btn-primary" to="/shop">
              Browse the shop
            </Link>
          </StatusPanel>
        ) : (
          <>
            <div className="shop-toolbar">
              <p className="shop-count" aria-live="polite">
                {loading ? 'Loading products' : `${visible.length} ${visible.length === 1 ? 'product' : 'products'}`}
              </p>
              <button
                type="button"
                className="btn btn-secondary shop-sort"
                onClick={() => {
                  setDraftSort(sort);
                  setDraftStock(inStockOnly);
                  setSortOpen(true);
                }}
              >
                <SlidersHorizontal aria-hidden="true" />
                <span>
                  Sort<span className="shop-sort-current">: {sortLabel}</span>
                </span>
              </button>
            </div>

            <ProductGrid
              products={visible}
              variant="feature"
              empty={
                <NoResults
                  title={query ? `No products match “${query}”` : 'Nothing here right now'}
                  onClear={filtered ? clearAll : undefined}
                />
              }
            />
          </>
        )}
      </div>

      {sortOpen && (
        <Sheet
          title="Sort and filter"
          onClose={() => setSortOpen(false)}
          afterClose={() => go({ sort: draftSort, stock: draftStock })}
          footer={
            <button type="button" className="btn btn-primary btn-block btn-lg" onClick={() => setSortOpen(false)}>
              Show {draftCount} {draftCount === 1 ? 'product' : 'products'}
            </button>
          }
        >
          <fieldset className="shop-sheet-group">
            <legend className="field-label">Sort by</legend>
            <div className="choice-grid">
              {sorts.map((option) => (
                <label className="choice" key={option.value}>
                  <input
                    type="radio"
                    name="sort"
                    checked={draftSort === option.value}
                    onChange={() => setDraftSort(option.value)}
                  />
                  <span className="choice-title">{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="switch shop-sheet-group">
            <span className="choice-body">
              <span className="choice-title">In stock only</span>
              <span className="choice-note">Hide products that are sold out</span>
            </span>
            <input type="checkbox" checked={draftStock} onChange={(event) => setDraftStock(event.target.checked)} />
          </label>
        </Sheet>
      )}
    </AppShell>
  );
}
