import { CSSProperties, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Minus, Plus, RefreshCw } from 'lucide-react';
import { BackdropArt, FrameArt, SignArt, StickersArt } from './HomeArt';
import { AnimatedPrice } from './Motion';
import { Stepper } from './Primitives';
import { OUTCOMES } from '../outcomes';
import { CalculatedEstimate, DimensionUnit, PrintMaterial } from '../types/pricing';
import { computeLocalEstimate, fetchServerEstimate } from '../lib/calculator';
import { cedis, cedisFromPesewas, greetingLink } from '../lib/format';
import { parseDimension } from '../lib/printSteps';
import { isListedSize, lockedSizes } from '../lib/materialSizes';
import { useMaterials } from '../lib/useMaterials';
import '../styles/pages/quickprice.css';

/**
 * Quick price: pick a job, set a size, see the price without leaving the home
 * page. It uses the same pricing calls as the print flow (an instant local
 * figure, confirmed by the server a moment later), so the number here is the
 * number the visitor sees when they order. "Continue" opens the print flow
 * with the choices already filled in.
 *
 * Vehicle and glass jobs are left out on purpose: they are quoted by staff.
 */
const JOBS = [
  { slug: 'shop-signage', label: 'Banners & signs', Art: SignArt },
  { slug: 'stickers-labels', label: 'Stickers & labels', Art: StickersArt },
  { slug: 'events-backdrops', label: 'Event backdrops', Art: BackdropArt },
  { slug: 'indoor-decor', label: 'Indoor prints', Art: FrameArt },
];

/** A person's height in feet, used to draw the size to scale (5 ft 9 in). */
const PERSON_FT = 5.75;
const BOX_W = 250;
const BOX_H = 136;

const shortName = (material: PrintMaterial) => material.name.split(' (')[0];

/** One dimension with big minus and plus buttons around a number field. */
function SizeField({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: string;
  unit: DimensionUnit;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const step = unit === 'in' ? 1 : 0.5;
  const bump = (direction: 1 | -1) => {
    const current = Number(value);
    const base = Number.isFinite(current) && current > 0 ? current : 0;
    const next = Math.max(step, Math.round((base + direction * step) * 100) / 100);
    onChange(String(next));
  };

  return (
    <div className="qp-field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="qp-stepbox">
        <button type="button" onClick={() => bump(-1)} aria-label={`Smaller ${label.toLowerCase()}`}>
          <Minus aria-hidden="true" />
        </button>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value.replace(',', '.'))}
          aria-invalid={parseDimension(value) === null}
        />
        <span className="qp-unit" aria-hidden="true">
          {unit}
        </span>
        <button type="button" onClick={() => bump(1)} aria-label={`Bigger ${label.toLowerCase()}`}>
          <Plus aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** The job drawn to scale next to a person, so "8 × 4 ft" means something. */
function ScalePreview({ widthFt, heightFt, label }: { widthFt: number | null; heightFt: number | null; label: string }) {
  if (widthFt === null || heightFt === null) {
    return <div className="qp-scale is-empty" aria-hidden="true" />;
  }
  const scale = Math.min(BOX_H / Math.max(heightFt, PERSON_FT), BOX_W / Math.max(widthFt, 0.1));
  const rectW = Math.max(14, Math.round(widthFt * scale));
  const rectH = Math.max(14, Math.round(heightFt * scale));
  const personH = Math.round(PERSON_FT * scale);

  return (
    <div className="qp-scale" aria-hidden="true">
      <svg className="qp-person" width={Math.round((personH * 26) / 64)} height={personH} viewBox="0 0 26 64">
        <circle cx="13" cy="7" r="6" />
        <rect x="5" y="15" width="16" height="30" rx="6" />
        <rect x="5" y="42" width="7" height="22" rx="3" />
        <rect x="14" y="42" width="7" height="22" rx="3" />
      </svg>
      <span className="qp-rect" style={{ width: rectW, height: rectH }}>
        {rectW > 70 && rectH > 26 && <span>{label}</span>}
      </span>
    </div>
  );
}

export function QuickPrice() {
  const { materials, loading, error, retry } = useMaterials();

  const [slug, setSlug] = useState(JOBS[0].slug);
  const outcome = OUTCOMES.find((item) => item.slug === slug) ?? OUTCOMES[0];
  const [preset, setPreset] = useState(outcome.presets[0].label);
  const [widthText, setWidthText] = useState(String(outcome.presets[0].width));
  const [heightText, setHeightText] = useState(String(outcome.presets[0].height));
  const [unit, setUnit] = useState<DimensionUnit>(outcome.presets[0].unit);
  const [qty, setQty] = useState(1);
  const [design, setDesign] = useState(false);
  const [materialCode, setMaterialCode] = useState<string | undefined>();

  // The job's own materials, the badged one ("Popular") first.
  const jobMaterials = useMemo(
    () =>
      materials
        .filter((item) => item.outcomes.includes(slug) && item.category !== 'finish')
        .sort((a, b) => Number(Boolean(b.badge)) - Number(Boolean(a.badge)))
        .slice(0, 3),
    [materials, slug],
  );
  const material = jobMaterials.find((item) => item.code === materialCode) ?? jobMaterials[0];

  const width = parseDimension(widthText);
  const height = parseDimension(heightText);
  const validSize = width !== null && height !== null;

  // Some stock (photo paper, say) only comes in set sizes. Then the size
  // chips are that material's sizes, there is no custom size, and picking the
  // material moves the size to its first one if the current size isn't listed.
  const fixedSizes = lockedSizes(material);
  const sizeOptions = fixedSizes ?? outcome.presets;
  useEffect(() => {
    if (!fixedSizes) return;
    const listed =
      width !== null && height !== null ? fixedSizes.find((item) => isListedSize([item], width, height, unit)) : undefined;
    if (listed) {
      setPreset(listed.label);
      return;
    }
    const first = fixedSizes[0];
    setPreset(first.label);
    setWidthText(String(first.width));
    setHeightText(String(first.height));
    setUnit(first.unit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material?.code]);

  // Price on the device at once, then confirm with the server a moment later.
  const [estimate, setEstimate] = useState<CalculatedEstimate | null>(null);
  const [pricing, setPricing] = useState(false);
  useEffect(() => {
    if (!material || width === null || height === null) {
      setPricing(false);
      return;
    }
    setEstimate(computeLocalEstimate(material, width, height, unit, qty, design));
    setPricing(true);
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetchServerEstimate(material, width, height, unit, qty, design).then((result) => {
        if (cancelled) return;
        setEstimate(result);
        setPricing(false);
      });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [material, width, height, unit, qty, design]);

  const pickJob = (next: string) => {
    if (next === slug) return;
    const first = OUTCOMES.find((item) => item.slug === next)?.presets[0];
    setSlug(next);
    setMaterialCode(undefined);
    if (first) {
      setPreset(first.label);
      setWidthText(String(first.width));
      setHeightText(String(first.height));
      setUnit(first.unit);
    }
  };

  const pickPreset = (label: string) => {
    setPreset(label);
    const found = sizeOptions.find((item) => item.label === label);
    if (found) {
      setWidthText(String(found.width));
      setHeightText(String(found.height));
      setUnit(found.unit);
    }
  };

  // The total stays hidden while the job is being set up and appears only
  // when the customer asks for it. Changing anything hides it again.
  const setupKey = `${material?.code}|${widthText}|${heightText}|${unit}|${qty}|${design}`;
  const [calculatedKey, setCalculatedKey] = useState<string | null>(null);
  const calculated = calculatedKey === setupKey;

  // Rounding to the nearest cedi means one tiny sticker can come to GH₵0.
  const tooSmall = Boolean(calculated && estimate && validSize && estimate.basePesewas === 0);
  const showPrice = Boolean(calculated && estimate && validSize && !tooSmall);
  const canContinue = Boolean(showPrice && material);
  const total = estimate ? estimate.totalPesewas : 0;
  const printShare = estimate && total > 0 ? Math.round((estimate.basePesewas / total) * 100) : 100;

  const continueHref = useMemo(() => {
    if (!material) return '/print';
    const search = new URLSearchParams({ need: slug, material: material.code, step: 'size' });
    if (validSize) {
      search.set('w', widthText.trim());
      search.set('h', heightText.trim());
      search.set('u', unit);
      search.set('q', String(qty));
    }
    if (design) search.set('design', '1');
    return `/print?${search.toString()}`;
  }, [material, slug, validSize, widthText, heightText, unit, qty, design]);

  // Long totals (bulk orders) step the big figure down so it never clips.
  const priceLength = cedis(total / 100).length;
  const priceSize = priceLength >= 13 ? 'xlong' : priceLength >= 11 ? 'long' : 'normal';

  const sizeLabel = `${widthText} × ${heightText} ${unit}`;
  const widthFt = width === null ? null : unit === 'in' ? width / 12 : width;
  const heightFt = height === null ? null : unit === 'in' ? height / 12 : height;

  // On phones a small price pill follows you while the price card is off screen.
  const panelRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const [panelSeen, setPanelSeen] = useState(false);
  const [resultSeen, setResultSeen] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === panelRef.current) setPanelSeen(entry.isIntersecting);
        if (entry.target === resultRef.current) setResultSeen(entry.isIntersecting);
      });
    });
    if (panelRef.current) observer.observe(panelRef.current);
    if (resultRef.current) observer.observe(resultRef.current);
    return () => observer.disconnect();
  }, [loading, error]);
  const showPill = panelSeen && !resultSeen && showPrice;

  const unavailable = Boolean(error) && !loading;

  return (
    <section className="band home-quote" aria-labelledby="quote-title">
      <div className="container">
        <div className="qp-panel" ref={panelRef} data-reveal="">
          <header className="qp-head">
            <h2 id="quote-title">Get your price in seconds</h2>
            <p>Choose a job and a size. These are live prices from our price list, and the same ones you get when you order.</p>
          </header>

          {unavailable ? (
            <div className="qp-error" role="alert">
              <p>We couldn't load print prices. Check your connection and try again, or message us on WhatsApp.</p>
              <div className="qp-error-actions">
                <button type="button" className="btn btn-primary" onClick={retry}>
                  <RefreshCw aria-hidden="true" />
                  Try again
                </button>
                <a className="btn btn-secondary" href={greetingLink} target="_blank" rel="noreferrer">
                  WhatsApp us
                </a>
              </div>
            </div>
          ) : (
            <div className="qp-grid">
              <div className="qp-form">
                <div className="qp-step" role="group" aria-labelledby="qp-l1">
                  <h3 className="qp-legend" id="qp-l1">
                    <span className="qp-num" aria-hidden="true">
                      1
                    </span>
                    What are you printing?
                  </h3>
                  <div className="qp-jobs" role="radiogroup" aria-labelledby="qp-l1">
                    {JOBS.map(({ slug: jobSlug, label, Art }) => {
                      return (
                        <label className="qp-job" key={jobSlug}>
                          <input
                            type="radio"
                            name="quick-job"
                            checked={slug === jobSlug}
                            onChange={() => pickJob(jobSlug)}
                          />
                          <span className="qp-job-art" aria-hidden="true">
                            <Art />
                          </span>
                          <span className="qp-job-label">{label}</span>
                          <span className="qp-job-check" aria-hidden="true">
                            <Check strokeWidth={3} />
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="qp-step" role="group" aria-labelledby="qp-l2">
                  <h3 className="qp-legend" id="qp-l2">
                    <span className="qp-num" aria-hidden="true">
                      2
                    </span>
                    How big?
                  </h3>
                  <div className="qp-chips">
                    {sizeOptions.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        className="qp-chip"
                        aria-pressed={preset === item.label}
                        onClick={() => pickPreset(item.label)}
                      >
                        <span>{item.label}</span>
                        <small>
                          {item.width} × {item.height} {item.unit}
                        </small>
                      </button>
                    ))}
                    {!fixedSizes && (
                      <button
                        type="button"
                        className="qp-chip"
                        aria-pressed={preset === 'custom'}
                        onClick={() => setPreset('custom')}
                      >
                        <span>Custom size</span>
                        <small>Type your own</small>
                      </button>
                    )}
                  </div>
                  {fixedSizes && material && (
                    <p className="qp-hint">{shortName(material)} comes in these sizes only.</p>
                  )}

                  {!fixedSizes && preset === 'custom' && (
                    <div className="qp-custom">
                      <SizeField label="Width" value={widthText} unit={unit} onChange={setWidthText} />
                      <SizeField label="Height" value={heightText} unit={unit} onChange={setHeightText} />
                      <div className="qp-units" role="group" aria-label="Unit">
                        {(['ft', 'in'] as DimensionUnit[]).map((option) => (
                          <button
                            key={option}
                            type="button"
                            aria-pressed={unit === option}
                            onClick={() => setUnit(option)}
                          >
                            {option === 'ft' ? 'Feet' : 'Inches'}
                          </button>
                        ))}
                      </div>
                      {!validSize && (
                        <p className="qp-hint is-error" role="status">
                          Enter a width and height above 0 to see the price.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="qp-step" role="group" aria-labelledby="qp-l3">
                  <h3 className="qp-legend" id="qp-l3">
                    <span className="qp-num" aria-hidden="true">
                      3
                    </span>
                    The details
                  </h3>

                  {jobMaterials.length > 0 && (
                    <div className="qp-block">
                      <span className="field-label" id="qp-material-label">
                        Material
                      </span>
                      <div className="qp-chips" role="group" aria-labelledby="qp-material-label">
                        {jobMaterials.map((item) => (
                          <button
                            key={item.code}
                            type="button"
                            className="qp-chip"
                            aria-pressed={material?.code === item.code}
                            onClick={() => setMaterialCode(item.code)}
                          >
                            <span>{shortName(item)}</span>
                            {item.badge && <small>{item.badge}</small>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="qp-row2">
                    <div className="qp-block">
                      <span className="field-label" id="qp-qty-label">
                        How many
                      </span>
                      <Stepper
                        value={qty}
                        label="pieces"
                        onStep={(delta) => setQty((current) => Math.min(999, Math.max(1, current + delta)))}
                        onSet={(next) => setQty(Math.min(999, Math.max(1, next)))}
                      />
                    </div>
                    <div className="qp-block">
                      <span className="field-label" id="qp-art-label">
                        Artwork
                      </span>
                      <div className="qp-seg" role="group" aria-labelledby="qp-art-label">
                        <button type="button" aria-pressed={!design} onClick={() => setDesign(false)}>
                          I have it
                        </button>
                        <button type="button" aria-pressed={design} onClick={() => setDesign(true)}>
                          Design it for me
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="qp-result" ref={resultRef} aria-label="Your price">
                <div className="qp-result-top">
                  <span className="qp-kicker">Your price</span>
                  {material && <span className="qp-material">{shortName(material)}</span>}
                </div>

                <div className={`qp-total${calculated && pricing ? ' is-pricing' : ''}`} data-size={priceSize}>
                  {showPrice ? (
                    <AnimatedPrice value={total / 100} className="qp-price" />
                  ) : (
                    <span className="price qp-price">GH₵—</span>
                  )}
                  <span className="qp-sub">
                    {!validSize
                      ? 'Enter a size to see the price'
                      : !calculated
                        ? 'Set it up, then tap Calculate price'
                        : tooSmall
                        ? 'Too small to print on its own. Add more pieces.'
                        : qty > 1 && estimate
                          ? `For ${qty} pieces`
                          : loading || !estimate
                            ? 'Getting the latest rates'
                            : pricing
                              ? 'Checking the price'
                              : 'For one piece'}
                  </span>
                </div>

                <ScalePreview widthFt={widthFt} heightFt={heightFt} label={sizeLabel} />

                {showPrice && estimate && (
                  <dl className="qp-breakdown">
                    <div className="qp-line" style={{ '--p': `${printShare}%` } as CSSProperties}>
                      <dt>
                        Print
                        <small>
                          {estimate.totalAreaSqFt} sq ft
                        </small>
                      </dt>
                      <dd>{cedisFromPesewas(estimate.basePesewas)}</dd>
                    </div>
                    {estimate.designFeePesewas > 0 && (
                      <div className="qp-line is-design" style={{ '--p': `${100 - printShare}%` } as CSSProperties}>
                        <dt>
                          Design
                          <small>From, confirmed on review</small>
                        </dt>
                        <dd>{cedisFromPesewas(estimate.designFeePesewas)}</dd>
                      </div>
                    )}
                  </dl>
                )}

                {calculated ? (
                  <Link className="btn btn-primary btn-lg btn-block" to={continueHref} viewTransition aria-disabled={!canContinue} tabIndex={canContinue ? 0 : -1}>
                    Continue with this size
                    <ArrowRight aria-hidden="true" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-lg btn-block"
                    disabled={!validSize || !material || loading}
                    onClick={() => setCalculatedKey(setupKey)}
                  >
                    Calculate price
                  </button>
                )}
                <p className="qp-note">
                  Something else?
                  <Link to="/contact" viewTransition>
                    Ask for a quote
                  </Link>
                </p>

                <p className="visually-hidden" role="status">
                  {showPrice && !pricing ? `Your price is ${cedis(total / 100)}.` : ''}
                </p>
              </aside>
            </div>
          )}
        </div>
      </div>

      <div className="qp-pill" data-show={showPill} aria-hidden={!showPill}>
        <span className="qp-pill-text">
          <small>Your price</small>
          {showPrice ? <b>{cedis(total / 100)}</b> : <b>GH₵—</b>}
        </span>
        <button
          type="button"
          className="btn btn-primary"
          tabIndex={showPill ? 0 : -1}
          onClick={() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        >
          See details
        </button>
      </div>
    </section>
  );
}
