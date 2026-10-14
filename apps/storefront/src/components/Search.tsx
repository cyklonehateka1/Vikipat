import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Search as SearchIcon, X } from 'lucide-react';
import { matches, productImage, useCatalog } from '../catalog';
import { cedis, searchHref } from '../lib/format';
import { useOverlay } from '../lib/useOverlay';

const quickSearches = ['Banner', 'Shirt', 'Sticker', 'Mug', 'Labels', 'Flyers'];

function SearchHits({
  term,
  limit,
  replace,
  onPick,
}: {
  term: string;
  limit: number;
  replace?: boolean;
  onPick: () => void;
}) {
  const { products } = useCatalog();
  const hits = term.trim() ? products.filter((product) => matches(product, term)).slice(0, limit) : [];
  if (!hits.length) return null;

  return (
    <ul className="search-results" aria-label="Suggestions">
      {hits.map((product) => (
        <li key={product.id}>
          <Link className="search-hit" to={`/product/${product.id}`} replace={replace} onClick={onPick}>
            <img src={productImage(product)} alt="" width={44} height={44} loading="lazy" />
            <span className="search-hit-text">
              <span className="search-hit-name">{product.name}</span>
              <span className="search-hit-meta">{product.department}</span>
            </span>
            <span className="price">{cedis(product.price)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SearchField({
  term,
  setTerm,
  onSubmit,
  inputRef,
  onFocus,
}: {
  term: string;
  setTerm: (value: string) => void;
  onSubmit: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onFocus?: () => void;
}) {
  return (
    <form
      className="search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="search-field">
        <SearchIcon aria-hidden="true" />
        <span className="visually-hidden">Search products</span>
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Search shirts, banners, stickers"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onFocus={onFocus}
        />
        {term && (
          <button type="button" className="icon-btn" onClick={() => setTerm('')} aria-label="Clear search">
            <X aria-hidden="true" />
          </button>
        )}
      </label>
    </form>
  );
}

/** Desktop header search with a suggestion popover. */
export function InlineSearch() {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const away = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  const done = () => {
    setOpen(false);
    setTerm('');
  };

  const submit = () => {
    if (!term.trim()) return;
    navigate(searchHref(term.trim()));
    done();
  };

  return (
    <div
      className="site-header-search search"
      ref={wrapRef}
      onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
    >
      <SearchField
        term={term}
        setTerm={(value) => {
          setTerm(value);
          setOpen(true);
        }}
        onSubmit={submit}
        onFocus={() => setOpen(true)}
      />
      {open && term.trim() && (
        <div className="search-popover">
          <SearchHits term={term} limit={5} onPick={done} />
          <button type="button" className="search-all" onClick={submit}>
            See all results for “{term.trim()}”
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Full-screen search on phones. Links replace the sheet's history entry. */
export function SearchSheet({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { panelRef } = useOverlay(onClose, { initialFocus: inputRef });
  const { departments } = useCatalog();
  const [term, setTerm] = useState('');
  const navigate = useNavigate();

  const submit = () => {
    if (!term.trim()) return;
    navigate(searchHref(term.trim()), { replace: true });
    onClose();
  };

  return createPortal(
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <div className="sheet sheet-full" role="dialog" aria-modal="true" aria-label="Search" ref={panelRef}>
      <div className="search-sheet-head">
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close search">
          <ArrowLeft aria-hidden="true" />
        </button>
        <SearchField term={term} setTerm={setTerm} onSubmit={submit} inputRef={inputRef} />
      </div>
      <div className="search-sheet-body">
        {term.trim() ? (
          <>
            <SearchHits term={term} limit={8} replace onPick={onClose} />
            <button type="button" className="search-all" onClick={submit}>
              See all results for “{term.trim()}”
              <ChevronRight aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <p className="search-suggest-title">Popular searches</p>
            <div className="search-quick">
              {quickSearches.map((word) => (
                <button key={word} type="button" className="chip" onClick={() => setTerm(word)}>
                  {word}
                </button>
              ))}
            </div>
            {departments.length > 0 && (
              <>
                <p className="search-suggest-title">Browse the shop</p>
                <div className="search-quick">
                  {departments.map((department) => (
                    <Link
                      key={department.slug}
                      className="chip"
                      to={`/department/${department.slug}`}
                      replace
                      onClick={onClose}
                    >
                      {department.name}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
      </div>
    </>,
    document.body,
  );
}
