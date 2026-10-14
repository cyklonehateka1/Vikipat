import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, MessageCircle, Plus, RefreshCw } from 'lucide-react';
import { AppShell } from '../AppShell';
import { AnimatedPrice } from '../Motion';
import { StatusPanel } from '../ProductGrid';
import { useToast } from '../Toast';
import { Outcome, outcomeBySlug } from '../../outcomes';
import { useOrder } from '../../order';
import { CalculatedEstimate, PrintMaterial } from '../../types/pricing';
import { computeLocalEstimate, fetchServerEstimate } from '../../lib/calculator';
import { cedisFromPesewas, greetingLink } from '../../lib/format';
import { parseDimension, PrintStep, resolveStep } from '../../lib/printSteps';
import { isListedSize, lockedSizes } from '../../lib/materialSizes';
import { useMaterials } from '../../lib/useMaterials';
import { useTitle } from '../../lib/useTitle';
import { site } from '../../site';
import { ArtworkStep } from './ArtworkStep';
import { JobStep } from './JobStep';
import { MaterialSheet } from './MaterialSheet';
import { SizeStep } from './SizeStep';
import { ArtworkState, SizeState } from './types';
import '../../styles/pages/print.css';

function startingSize(outcome?: Outcome): SizeState {
  const preset = outcome?.presets[0];
  if (!preset) return { preset: 'custom', widthText: '4', heightText: '3', unit: 'ft' };
  return { preset: preset.label, widthText: String(preset.width), heightText: String(preset.height), unit: preset.unit };
}

/**
 * A size handed over from the home page's quick price (?w=&h=&u=). Anything
 * that does not parse as a valid size is ignored and the job's own starting
 * size is used instead.
 */
function sizeFromParams(params: URLSearchParams, outcome?: Outcome): SizeState | null {
  const w = params.get('w') ?? '';
  const h = params.get('h') ?? '';
  if (parseDimension(w) === null || parseDimension(h) === null) return null;
  const unit = params.get('u') === 'in' ? 'in' : 'ft';
  const match = outcome?.presets.find((p) => p.width === Number(w) && p.height === Number(h) && p.unit === unit);
  return { preset: match?.label ?? 'custom', widthText: w, heightText: h, unit };
}

function quantityFromParams(params: URLSearchParams) {
  const q = Math.round(Number(params.get('q')));
  return Number.isFinite(q) && q >= 1 && q <= 999 ? q : 1;
}

/** The job's own materials, the badged one ("Popular") first. */
const STEP_META: { id: PrintStep; label: string }[] = [
  { id: 'job', label: 'Job' },
  { id: 'size', label: 'Size' },
  { id: 'artwork', label: 'Artwork' },
];

/** The labelled step bar: a checkmark for done steps, a filled circle for
 * the current one, a plain number for what's ahead — after the reference,
 * but compact enough to sit above the price and Back/Next row on a phone. */
function PrintSteps({ step }: { step: PrintStep }) {
  const currentIndex = STEP_META.findIndex((item) => item.id === step);
  return (
    <ol className="print-steps" aria-hidden="true">
      {STEP_META.map((item, index) => {
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming';
        return (
          <li key={item.id} className={`print-step-item is-${state}`}>
            <span className="print-step-badge">{state === 'done' ? <Check strokeWidth={3} /> : index + 1}</span>
            <span className="print-step-label">{item.label}</span>
            {index < STEP_META.length - 1 && <ArrowRight className="print-step-arrow" />}
          </li>
        );
      })}
    </ol>
  );
}

function suggestedFor(materials: PrintMaterial[], outcome?: Outcome) {
  if (!outcome) return [];
  const matched = materials.filter((material) => material.outcomes.includes(outcome.slug));
  return [...matched].sort((a, b) => Number(Boolean(b.badge)) - Number(Boolean(a.badge)));
}

const isLink = (value: string) => /^https?:\/\/\S+\.\S+/i.test(value.trim());

/**
 * Print a job in three steps: what, size, artwork. The step is kept in the URL
 * (?step=) so the phone's back button walks back through the flow, and the
 * price bar at the bottom always shows the live total.
 */
export function PrintFlow() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { addCustomJob } = useOrder();
  const { show } = useToast();
  const { materials, loading, error, retry } = useMaterials();

  const need = params.get('need') ?? undefined;
  const materialParam = params.get('material') ?? undefined;
  const outcome = need ? outcomeBySlug(need) : undefined;

  const [materialCode, setMaterialCode] = useState<string | undefined>(materialParam);
  const [size, setSize] = useState<SizeState>(() => sizeFromParams(params, outcome) ?? startingSize(outcome));
  const [qty, setQty] = useState(() => quantityFromParams(params));
  const [artwork, setArtwork] = useState<ArtworkState>({
    option: params.get('design') === '1' ? 'design_service' : 'upload',
    url: '',
    name: '',
    link: '',
    notes: '',
  });
  const [uploading, setUploading] = useState(false);
  const [sizeConfirmed, setSizeConfirmed] = useState(false);
  const [sheet, setSheet] = useState<'job-material' | 'size-material' | null>(null);
  const pendingMaterial = useRef<string | null>(null);

  // A different job starts from its own suggested size and material.
  const lastNeed = useRef(need);
  useEffect(() => {
    if (lastNeed.current === need) return;
    lastNeed.current = need;
    setSize(startingSize(need ? outcomeBySlug(need) : undefined));
    setMaterialCode(materialParam);
    setSizeConfirmed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [need]);

  const suggested = useMemo(() => suggestedFor(materials, outcome), [materials, outcome]);
  const material =
    materials.find((item) => item.code === materialCode) ?? suggested[0] ?? (outcome ? materials[0] : undefined);

  // Stock sold in set sizes only: if the current size isn't one of them
  // (a new material, or a size carried over from the homepage), use the first.
  const fixedSizes = lockedSizes(material);
  useEffect(() => {
    if (!fixedSizes) return;
    const w = parseDimension(size.widthText);
    const h = parseDimension(size.heightText);
    const listed =
      w !== null && h !== null ? fixedSizes.find((item) => isListedSize([item], w, h, size.unit)) : undefined;
    if (listed) {
      if (size.preset !== listed.label) setSize({ ...size, preset: listed.label });
      return;
    }
    const first = fixedSizes[0];
    setSize({ preset: first.label, widthText: String(first.width), heightText: String(first.height), unit: first.unit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material?.code]);

  const hasJob = Boolean(outcome || materialParam);
  const step: PrintStep = resolveStep(params.get('step'), hasJob, sizeConfirmed);

  const width = parseDimension(size.widthText);
  const height = parseDimension(size.heightText);
  const validSize = width !== null && height !== null;
  const areaPerPiece = validSize
    ? Math.round((size.unit === 'in' ? (width * height) / 144 : width * height) * 100) / 100
    : null;
  const needsDesign = artwork.option === 'design_service';

  // Price locally at once, then confirm with the server a moment later. The
  // server's estimate carries the id checkout needs, so adding waits for it.
  const [estimate, setEstimate] = useState<CalculatedEstimate | null>(null);
  const [pricing, setPricing] = useState(false);
  const [calculatedKey, setCalculatedKey] = useState<string | null>(null);
  useEffect(() => {
    if (!material || width === null || height === null) return;
    setEstimate(computeLocalEstimate(material, width, height, size.unit, qty, needsDesign));
    setPricing(true);
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetchServerEstimate(material, width, height, size.unit, qty, needsDesign).then((result) => {
        if (cancelled) return;
        setEstimate(result);
        setPricing(false);
      });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [material, width, height, size.unit, qty, needsDesign]);

  // New step: start at the top, with focus on the page for screen readers.
  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [step]);

  const title = step === 'artwork' ? 'Artwork' : outcome?.label ?? material?.name ?? 'Print';
  useTitle(`${step === 'job' ? 'Print' : title} | ${site.fullName}`);

  /** Steps are pushed, never replaced, so Back returns to the previous one. */
  const goStep = (next: PrintStep, extra: Record<string, string | undefined> = {}) => {
    const search = new URLSearchParams(params);
    Object.entries(extra).forEach(([key, value]) => (value ? search.set(key, value) : search.delete(key)));
    if (next === 'job') search.delete('step');
    else search.set('step', next);
    setParams(search);
  };

  const summary = material
    ? `${material.name}, ${size.widthText} × ${size.heightText} ${size.unit}, ${qty} ${qty === 1 ? 'piece' : 'pieces'}`
    : '';

  const artworkReady =
    artwork.option === 'later' ||
    artwork.option === 'design_service' ||
    (artwork.option === 'upload' && Boolean(artwork.url) && !uploading) ||
    (artwork.option === 'link' && isLink(artwork.link));

  const addToCart = () => {
    if (!estimate || !artworkReady || pricing) return;
    addCustomJob({
      estimate,
      artworkOption: artwork.option,
      artworkUrl: artwork.option === 'upload' ? artwork.url || undefined : undefined,
      artworkName: artwork.option === 'upload' ? artwork.name || undefined : undefined,
      artworkLink: artwork.option === 'link' ? artwork.link.trim() : undefined,
      notes: artwork.notes.trim() || undefined,
    });
    show(`${outcome?.label ?? estimate.serviceName} added to your cart`);
    navigate('/cart');
  };

  const materialSheet = sheet && (
    <MaterialSheet
      materials={materials}
      suggested={sheet === 'size-material' ? suggested : []}
      selectedCode={material?.code}
      onPick={(code) => {
        if (sheet === 'job-material') pendingMaterial.current = code;
        else setMaterialCode(code);
        setSheet(null);
      }}
      onClose={() => setSheet(null)}
      afterClose={() => {
        // Starting from a material changes the URL, so wait for the sheet's
        // history entry to be gone first.
        const code = pendingMaterial.current;
        pendingMaterial.current = null;
        if (code) {
          setMaterialCode(code);
          goStep('size', { material: code, need: undefined });
        }
      }}
    />
  );

  if (step === 'job') {
    return (
      <AppShell>
        <div className="container print-top">
          <p className="visually-hidden">Step 1 of 3</p>
          <PrintSteps step={step} />
        </div>
        <JobStep
          materials={materials}
          loading={loading}
          error={error}
          retry={retry}
          onPickOutcome={(slug) => {
            setSizeConfirmed(false);
            goStep('size', { need: slug, material: undefined });
          }}
          onBrowseMaterials={() => setSheet('job-material')}
        />
        {materialSheet}
      </AppShell>
    );
  }

  const unavailable = error ? (
    <div className="container section">
      <StatusPanel
        kind="error"
        title="We couldn't load print prices"
        note="Check your connection and try again, or send us the details on WhatsApp."
      >
        <button type="button" className="btn btn-primary" onClick={retry}>
          <RefreshCw aria-hidden="true" />
          Try again
        </button>
        <a className="btn btn-secondary" href={greetingLink} target="_blank" rel="noreferrer">
          <MessageCircle className="wa" aria-hidden="true" />
          WhatsApp us
        </a>
      </StatusPanel>
    </div>
  ) : null;

  // On the size step the total stays hidden while the job is being set up and
  // appears only when the customer taps Calculate price. Changing the size,
  // quantity or material hides it again. The artwork step shows it.
  const setupKey = `${material?.code}|${size.widthText}|${size.heightText}|${size.unit}|${qty}`;
  const calculated = step !== 'size' || calculatedKey === setupKey;

  // Prices round to the nearest cedi, so a single tiny sticker can come to
  // GH₵0, which cannot be paid online. Ask for more pieces instead.
  const tooSmall = Boolean(calculated && estimate && validSize && estimate.basePesewas === 0);
  const showPrice = Boolean(calculated && estimate && validSize);
  let note = '';
  if (!validSize) note = 'Enter a valid size to see the price';
  else if (!calculated) note = 'Tap Calculate price';
  else if (tooSmall) note = 'Too small to print on its own. Add more pieces';
  else if (pricing || !estimate) note = 'Checking the price';
  else {
    note = `${estimate.totalAreaSqFt} sq ft`;
    if (estimate.designFeePesewas > 0) note += `, design from ${cedisFromPesewas(estimate.designFeePesewas)}`;
  }
  if (step === 'artwork' && !artworkReady && !uploading) {
    note =
      artwork.option === 'upload'
        ? 'Choose a file, or pick another option'
        : 'Paste your link to continue';
  }

  const figure = (
    <span className="action-bar-figure" aria-live="polite">
      {showPrice && estimate ? (
        <AnimatedPrice value={estimate.totalPesewas / 100} className="price-big" />
      ) : (
        <span className="price price-big">GH₵—</span>
      )}
      <span className="action-bar-note">{note}</span>
    </span>
  );

  const primaryAction =
    step === 'size' && !calculated ? (
      <button
        type="button"
        className="btn print-next"
        disabled={!validSize || !material || loading}
        onClick={() => setCalculatedKey(setupKey)}
      >
        Calculate price
      </button>
    ) : step === 'size' ? (
      <button
        type="button"
        className="btn print-next"
        disabled={!validSize || !material || loading || tooSmall}
        onClick={() => {
          setSizeConfirmed(true);
          goStep('artwork');
        }}
      >
        Next step
        <ArrowRight aria-hidden="true" />
      </button>
    ) : (
      <button
        type="button"
        className="btn print-next"
        disabled={!artworkReady || pricing || !estimate || uploading || tooSmall}
        onClick={addToCart}
      >
        <Plus aria-hidden="true" />
        Add to cart
      </button>
    );

  // Steps push a new URL entry (see goStep), so Back is just history back —
  // the same path ArtworkStep's "edit size" link already used.
  const goBack = () => navigate(-1);

  // Phones: one slim row — price, a round Back, Next. Hidden from 1024 px,
  // where the summary card beside the form takes over.
  const bar = (
    <div className="print-bar">
      <div className="print-bar-price">{figure}</div>
      <button type="button" className="print-back-round" onClick={goBack} aria-label="Back">
        <ArrowLeft aria-hidden="true" />
      </button>
      {primaryAction}
    </div>
  );

  const aside = (
    <aside className="print-aside" aria-label="Your order">
      <p className="print-aside-kicker">Your order</p>
      {material && (
        <dl className="print-aside-lines">
          <div>
            <dt>Material</dt>
            <dd>{material.name}</dd>
          </div>
          <div>
            <dt>Size</dt>
            <dd>
              {validSize ? `${size.widthText} × ${size.heightText} ${size.unit}` : '—'}
            </dd>
          </div>
          <div>
            <dt>Quantity</dt>
            <dd>{qty}</dd>
          </div>
        </dl>
      )}
      <div className="print-aside-total">
        {showPrice && estimate ? (
          <AnimatedPrice value={estimate.totalPesewas / 100} className="price print-aside-price" />
        ) : (
          <span className="price print-aside-price">GH₵—</span>
        )}
        <span className="print-aside-note">{note}</span>
      </div>
      <div className="print-aside-actions">{primaryAction}</div>
      <button type="button" className="print-aside-back" onClick={goBack}>
        <ArrowLeft aria-hidden="true" />
        Back
      </button>
    </aside>
  );

  return (
    <AppShell
      title={title}
      back="/print"
      footer={false}
      bar={unavailable ? undefined : bar}
      barPhoneOnly
      tabs={false}
    >
      <div className="container print-top">
        <p className="visually-hidden">Step {step === 'size' ? 2 : 3} of 3</p>
        <PrintSteps step={step} />
      </div>
      {unavailable ?? (
        <div className="container print-layout">
          <div className="print-main">
            {step === 'size' ? (
          <SizeStep
            outcome={outcome}
            material={material}
            size={size}
            setSize={setSize}
            qty={qty}
            setQty={setQty}
            width={width}
            height={height}
            areaPerPiece={areaPerPiece}
            tooSmall={tooSmall}
            onChangeMaterial={() => setSheet('size-material')}
          />
        ) : (
          <ArtworkStep
            artwork={artwork}
            setArtwork={setArtwork}
            onUploading={setUploading}
            designFromPesewas={material ? Math.round(material.designMinimumPesewas / 100) * 100 : null}
            summary={summary}
            onEditSize={() => navigate(-1)}
            linkError={artwork.option === 'link' && artwork.link.trim() !== '' && !isLink(artwork.link)}
          />
            )}
          </div>
          {aside}
        </div>
      )}
      {materialSheet}
    </AppShell>
  );
}
