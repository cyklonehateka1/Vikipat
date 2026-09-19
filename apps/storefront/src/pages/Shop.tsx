import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { Layout, PageHead } from '../components/Layout';
import { ProductGrid, NoResults } from '../components/ProductGrid';
import { Crumbs } from '../components/Primitives';
import { matches, useCatalog } from '../catalog';
import { isSort, sortProducts, sorts } from '../lib/sorting';
import { pad } from '../lib/format';
import { site } from '../site';
import { useReveal, useTitle } from '../lib/useReveal';

const ALL = 'all';

export default function Shop() {
  const { departments, products, loading } = useCatalog();
  const [params, setParams] = useSearchParams();

  const dept = params.get('dept') ?? ALL;
  const query = params.get('q') ?? '';
  const availability = params.get('stock') ?? 'any';
  const sortParam = params.get('sort');
  const sort = isSort(sortParam) ? sortParam : 'featured';

  useTitle(`All Products & Services | ${site.fullName}`);

  const visible = useMemo(() => {
    const matched = products.filter((product) => {
      const inDept = dept === ALL || product.departmentSlug === dept;
      const stocked = availability === 'any' || product.availability !== 'out';
      return inDept && stocked && matches(product, query);
    });
    return sortProducts(matched, sort);
  }, [products, dept, query, availability, sort]);

  useReveal([visible.length, loading]);

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const filtered = dept !== ALL || availability !== 'any' || Boolean(query);
  const clear = () => setParams({});
  const activeDept = departments.find((item) => item.slug === dept);

  return (
    <Layout>
      <PageHead
        title="Print &amp; Branding Catalogue"
        lede="Explore our complete line of commercial printing, bespoke corporate apparel, promotional merchandise, and signage. Held in stock and customized with your artwork in Accra."
        stats={[
          { label: 'Categories', value: pad(departments.length) },
          { label: 'Product Lines', value: pad(products.length) },
        ]}
      >
        <Crumbs trail={[{ label: 'Home', to: '/' }, { label: 'All Products' }]} />
      </PageHead>

      <section className="shell section-tight">
        <div className="catalogue">
          {/* Desktop Filter Sidebar */}
          <aside className="rail" aria-label="Filter the catalogue">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 className="h3" style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal aria-hidden="true" style={{ width: 16, height: 16, color: 'var(--brand-primary)' }} />
                <span>Filters</span>
              </h2>
              {filtered && (
                <button
                  className="link"
                  onClick={clear}
                  style={{ fontSize: 'var(--t-micro)', textTransform: 'uppercase' }}
                >
                  Reset all
                </button>
              )}
            </div>

            <div className="rail-group">
              <h3>Category</h3>
              <button
                className="rail-opt"
                aria-pressed={dept === ALL}
                onClick={() => update('dept', null)}
              >
                <span>All Categories</span>
                <span className="count">{pad(products.length)}</span>
              </button>
              {departments.map((item) => (
                <button
                  key={item.slug}
                  className="rail-opt"
                  aria-pressed={dept === item.slug}
                  onClick={() => update('dept', item.slug)}
                >
                  <span>{item.name}</span>
                  <span className="count">{pad(item.count)}</span>
                </button>
              ))}
            </div>

            <div className="rail-group">
              <h3>Stock Status</h3>
              <button
                className="rail-opt"
                aria-pressed={availability === 'any'}
                onClick={() => update('stock', null)}
              >
                <span>Show All Items</span>
              </button>
              <button
                className="rail-opt"
                aria-pressed={availability === 'in'}
                onClick={() => update('stock', 'in')}
              >
                <span>In Stock Only</span>
              </button>
            </div>

            {filtered && (
              <button className="btn btn-secondary btn-sm btn-block" onClick={clear}>
                <X aria-hidden="true" style={{ width: 14, height: 14 }} />
                <span>Clear All Filters</span>
              </button>
            )}
          </aside>

          {/* Product Grid Area */}
          <div>
            {/* Mobile / Tablet Horizontal Category Filter Strip */}
            <div className="filter-strip" role="group" aria-label="Filter by category">
              <button
                className="chip"
                aria-pressed={dept === ALL}
                onClick={() => update('dept', null)}
              >
                All
              </button>
              {departments.map((item) => (
                <button
                  key={item.slug}
                  className="chip"
                  aria-pressed={dept === item.slug}
                  onClick={() => update('dept', item.slug)}
                >
                  {item.short}
                  <span className="count">{pad(item.count)}</span>
                </button>
              ))}
            </div>

            <div className="toolbar">
              <p className="toolbar-count" aria-live="polite">
                Showing <strong>{pad(visible.length)}</strong> {visible.length === 1 ? 'line' : 'lines'}
                {activeDept && ` in ${activeDept.name}`}
                {query && ` matching “${query}”`}
              </p>

              <div className="toolbar-end">
                <label className="label-micro" htmlFor="sort">
                  Sort By
                </label>
                <span className="select-wrap">
                  <select
                    id="sort"
                    className="select select-sm"
                    value={sort}
                    onChange={(event) => update('sort', event.target.value)}
                  >
                    {sorts.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown aria-hidden="true" />
                </span>
              </div>
            </div>

            <ProductGrid
              products={visible}
              empty={
                <NoResults
                  title="No items found matching your filter"
                  note="Try changing your search terms or clearing your filters to view all available print products."
                  onClear={filtered ? clear : undefined}
                />
              }
            />
          </div>
        </div>
      </section>
    </Layout>
  );
}
