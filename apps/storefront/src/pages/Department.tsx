import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Layout } from '../components/Layout';
import { ProductGrid, NoResults } from '../components/ProductGrid';
import { Crumbs } from '../components/Primitives';
import { inDepartment, useCatalog } from '../catalog';
import { isSort, sortProducts, sorts } from '../lib/sorting';
import { deptHref, pad } from '../lib/format';
import { site } from '../site';
import { useReveal, useTitle } from '../lib/useReveal';
import NotFound from './NotFound';

export default function Department() {
  const { slug = '' } = useParams();
  const { departments, products, loading, error } = useCatalog();
  const [params, setParams] = useSearchParams();

  const availability = params.get('stock') ?? 'any';
  const sortParam = params.get('sort');
  const sort = isSort(sortParam) ? sortParam : 'featured';

  const department = departments.find((item) => item.slug === slug);

  useTitle(department ? `${department.name} | ${site.fullName}` : `Category | ${site.fullName}`);

  const visible = useMemo(() => {
    const matched = inDepartment(products, slug).filter(
      (product) => availability === 'any' || product.availability !== 'out',
    );
    return sortProducts(matched, sort);
  }, [products, slug, availability, sort]);

  useReveal([visible.length, loading]);

  if (!loading && !error && !department) {
    return <NotFound reason="That category is not one we keep in the catalogue." />;
  }

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const others = departments.filter((item) => item.slug !== slug);

  return (
    <Layout>
      <section className="dept-head">
        <div className="dept-head-inner">
          <div>
            <Crumbs
              trail={[
                { label: 'Home', to: '/' },
                { label: 'All Products', to: '/shop' },
                { label: department?.name ?? 'Category' },
              ]}
            />
            <h1 className="h1">{department?.name ?? 'Category'}</h1>
            {department && <p className="lede">{department.blurb}</p>}
            
            <div className="row row-wrap" style={{ marginTop: 'var(--s5)', gap: '10px' }}>
              <span className="badge badge-featured">{pad(visible.length)} products available</span>
              {others.length > 0 && (
                <>
                  <span className="label-micro" style={{ alignSelf: 'center', marginLeft: '6px' }}>
                    Other categories:
                  </span>
                  {others.map((item) => (
                    <Link className="chip" key={item.slug} to={deptHref(item.slug)}>
                      {item.short}
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>

          {department && (
            <figure>
              <img
                src={department.image}
                alt={department.imageAlt}
                width={700}
                height={440}
              />
            </figure>
          )}
        </div>
      </section>

      <section className="shell section-tight">
        <div className="toolbar">
          <p className="toolbar-count" aria-live="polite">
            Showing <strong>{pad(visible.length)}</strong> {visible.length === 1 ? 'item' : 'items'} in {department?.name}
          </p>

          <div className="toolbar-end">
            <button
              className="chip"
              aria-pressed={availability === 'in'}
              onClick={() => update('stock', availability === 'in' ? null : 'in')}
            >
              In stock only
            </button>
            <label className="label-micro" htmlFor="dept-sort">
              Sort By
            </label>
            <span className="select-wrap">
              <select
                id="dept-sort"
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
              title="Nothing available in this category right now"
              note="This line is currently between print batches. Contact our team to place a bespoke order or browse our other categories."
              onClear={availability === 'in' ? () => update('stock', null) : undefined}
            />
          }
        />
      </section>

      <section className="shell section-tight">
        <div className="row row-wrap">
          <Link className="btn btn-secondary" to="/shop">
            <span>Browse All Product Categories</span>
            <ArrowRight aria-hidden="true" style={{ width: 16, height: 16 }} />
          </Link>
        </div>
      </section>
    </Layout>
  );
}
