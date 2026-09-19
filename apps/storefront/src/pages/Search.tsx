import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Layout, PageHead } from '../components/Layout';
import { ProductGrid, NoResults } from '../components/ProductGrid';
import { Crumbs } from '../components/Primitives';
import { matches, useCatalog } from '../catalog';
import { isSort, sortProducts, sorts } from '../lib/sorting';
import { pad } from '../lib/format';
import { site } from '../site';
import { useReveal, useTitle } from '../lib/useReveal';

export default function Search() {
  const { products, departments, loading } = useCatalog();
  const [params, setParams] = useSearchParams();

  const query = params.get('q') ?? '';
  const sortParam = params.get('sort');
  const sort = isSort(sortParam) ? sortParam : 'featured';

  useTitle(query ? `Results for “${query}” | Search | ${site.fullName}` : `Search Products | ${site.fullName}`);

  const results = useMemo(
    () => sortProducts(products.filter((product) => matches(product, query)), sort),
    [products, query, sort],
  );

  useReveal([results.length, loading]);

  const hitDepartments = departments.filter((department) =>
    results.some((product) => product.departmentSlug === department.slug),
  );

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  return (
    <Layout>
      <PageHead
        title={query ? `Search Results for “${query}”` : 'Search Print & Branding Products'}
        lede={
          query
            ? `Matching products across all categories held in our Accra production facility.`
            : 'Type any keyword in the search bar above to explore shirts, banners, business cards, mugs, and corporate gifts.'
        }
        stats={query ? [{ label: 'Matching Lines', value: pad(results.length) }] : undefined}
      >
        <Crumbs
          trail={[
            { label: 'Home', to: '/' },
            { label: 'All Products', to: '/shop' },
            { label: 'Search Results' },
          ]}
        />
      </PageHead>

      <section className="shell section-tight">
        {query && (
          <div className="toolbar">
            <p className="toolbar-count" aria-live="polite">
              Found <strong>{pad(results.length)}</strong> {results.length === 1 ? 'item' : 'items'} matching “{query}”
            </p>
            <div className="toolbar-end">
              <label className="label-micro" htmlFor="search-sort">
                Sort By
              </label>
              <span className="select-wrap">
                <select
                  id="search-sort"
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
        )}

        {hitDepartments.length > 1 && (
          <div className="filter-strip" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <span className="label-micro" style={{ alignSelf: 'center', marginRight: '4px' }}>
              Found in categories:
            </span>
            {hitDepartments.map((department) => (
              <Link className="chip" key={department.slug} to={`/department/${department.slug}`}>
                {department.name}
              </Link>
            ))}
          </div>
        )}

        <ProductGrid
          products={query ? results : []}
          empty={
            <NoResults
              title={query ? `No items match “${query}”` : 'Start your search above'}
              note={
                query
                  ? 'Try checking for typos or searching for a broader term like "shirt", "banner", or "cards". Alternatively, contact our team to source or produce bespoke items.'
                  : 'Enter a product name or category into the search bar at the top of the screen.'
              }
            />
          }
        />
      </section>
    </Layout>
  );
}
