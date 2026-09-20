import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileCheck,
  FileUp,
  HelpCircle,
  Link as LinkIcon,
  Maximize2,
  Palette,
  Ruler,
  UploadCloud,
} from "lucide-react";
import { PrintMaterial } from "../types/pricing";
import { useMaterials } from "../lib/useMaterials";
import { OUTCOMES, Outcome, SizePreset, outcomeBySlug } from "../outcomes";
import { computeLocalEstimate, fetchServerEstimate } from "../lib/calculator";
import { useOrder } from "../order";
import { Stepper } from "./Primitives";
import { API_BASE } from "../lib/api";
import "../styles/configurator.css";

type Step = 1 | 2 | 3;
type ArtworkOption = "upload" | "design_service" | "link" | "later";
type DimensionUnit = "ft" | "in";

const STEP_LABELS: Record<Step, string> = {
  1: "What are you making?",
  2: "Size & quantity",
  3: "Artwork",
};

function materialsForOutcome(materials: PrintMaterial[], outcome: Outcome | undefined) {
  if (!outcome) return materials;
  const matched = materials.filter((m) => m.outcomes.includes(outcome.slug));
  return matched.length ? matched : materials;
}

function recommend(materials: PrintMaterial[], outcome: Outcome | undefined) {
  const pool = materialsForOutcome(materials, outcome);
  // Prefer a badged material (Popular / Most Versatile / etc.), else the first.
  return pool.find((m) => m.badge) || pool[0];
}

interface PrintConfiguratorProps {
  /** Preselect an outcome (e.g. arriving from /print?need=shop-signage). */
  initialOutcomeSlug?: string;
  /** Preselect a material code directly, skipping the outcome recommendation. */
  initialMaterialCode?: string;
  onJobAdded?: (jobId: string) => void;
}

export function PrintConfigurator({
  initialOutcomeSlug,
  initialMaterialCode,
  onJobAdded,
}: PrintConfiguratorProps) {
  const navigate = useNavigate();
  const { addCustomJob, openDrawer } = useOrder();
  const { materials, loading: materialsLoading, error: materialsError } = useMaterials();

  const [step, setStep] = useState<Step>(initialOutcomeSlug || initialMaterialCode ? 2 : 1);
  const [outcomeSlug, setOutcomeSlug] = useState<string | undefined>(initialOutcomeSlug);
  const [materialCode, setMaterialCode] = useState<string | undefined>(initialMaterialCode);
  const [showAllMaterials, setShowAllMaterials] = useState(false);

  const [width, setWidth] = useState(4);
  const [height, setHeight] = useState(3);
  const [unit, setUnit] = useState<DimensionUnit>("ft");
  const [quantity, setQuantity] = useState(1);
  const [needsDesign, setNeedsDesign] = useState(false);

  const [artworkOption, setArtworkOption] = useState<ArtworkOption>("upload");
  const [artworkUrl, setArtworkUrl] = useState("");
  const [artworkName, setArtworkName] = useState("");
  const [artworkLink, setArtworkLink] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [addedNotice, setAddedNotice] = useState(false);

  const outcome = outcomeSlug ? outcomeBySlug(outcomeSlug) : undefined;

  const selectedMaterial = useMemo(
    () => materials.find((m) => m.code === materialCode),
    [materials, materialCode],
  );

  // Once materials arrive, resolve a recommendation for the chosen outcome
  // (or keep an explicit initial material selection).
  useEffect(() => {
    if (!materials.length || materialCode) return;
    const rec = recommend(materials, outcome);
    if (rec) setMaterialCode(rec.code);
  }, [materials, outcome, materialCode]);

  // Seed a sensible starting size once an outcome is chosen.
  useEffect(() => {
    if (!outcome) return;
    const preset = outcome.presets[0];
    setWidth(preset.width);
    setHeight(preset.height);
    setUnit(preset.unit);
  }, [outcomeSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  const [estimate, setEstimate] = useState(() =>
    selectedMaterial
      ? computeLocalEstimate(selectedMaterial, width, height, unit, quantity, needsDesign)
      : null,
  );
  const [pricing, setPricing] = useState(false);

  useEffect(() => {
    if (!selectedMaterial) return;
    let cancelled = false;
    setEstimate(computeLocalEstimate(selectedMaterial, width, height, unit, quantity, needsDesign));
    setPricing(true);
    fetchServerEstimate(selectedMaterial, width, height, unit, quantity, needsDesign).then((result) => {
      if (!cancelled) {
        setEstimate(result);
        setPricing(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedMaterial, width, height, unit, quantity, needsDesign]);

  const relevantMaterials = useMemo(
    () => (showAllMaterials ? materials : materialsForOutcome(materials, outcome)),
    [materials, outcome, showAllMaterials],
  );

  const canvasDims = useMemo(() => {
    const wIn = unit === "in" ? width : width * 12;
    const hIn = unit === "in" ? height : height * 12;
    const ratio = (wIn || 1) / (hIn || 1);
    const maxW = 300;
    const maxH = 220;
    let boxW = maxW;
    let boxH = boxW / ratio;
    if (boxH > maxH) {
      boxH = maxH;
      boxW = boxH * ratio;
    }
    return { width: Math.max(28, boxW), height: Math.max(28, boxH) };
  }, [width, height, unit]);

  const handleOutcomeSelect = (slug: string) => {
    setOutcomeSlug(slug);
    setMaterialCode(undefined);
    setShowAllMaterials(false);
    setStep(2);
  };

  const handleSkipToMaterial = () => {
    setOutcomeSlug(undefined);
    setShowAllMaterials(true);
    setStep(1);
  };

  const applyPreset = (preset: SizePreset) => {
    setWidth(preset.width);
    setHeight(preset.height);
    setUnit(preset.unit);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/quotes/media`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed. Please upload a PDF, PNG, JPG or WebP file under 10MB.");
      const data = await res.json();
      setArtworkUrl(data.url);
      setArtworkName(data.name || file.name);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Could not upload artwork.");
    } finally {
      setUploading(false);
    }
  };

  const handleAddJob = (proceedToCheckout: boolean) => {
    if (!estimate) return;
    const jobId = addCustomJob({
      estimate,
      artworkOption,
      artworkUrl: artworkUrl || undefined,
      artworkName: artworkName || undefined,
      artworkLink: artworkLink || undefined,
      notes: notes || undefined,
    });
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2400);
    onJobAdded?.(jobId);
    if (proceedToCheckout) navigate("/checkout");
    else openDrawer();
  };

  // "Send it later" and "design for me" need nothing further; upload/link need
  // the actual file or link before the job can be submitted, so a customer who
  // never touches the dropzone doesn't get silently marked as having attached one.
  const artworkReady =
    artworkOption === "later" ||
    artworkOption === "design_service" ||
    (artworkOption === "upload" && Boolean(artworkUrl) && !uploading) ||
    (artworkOption === "link" && artworkLink.trim().length > 0);

  const stepValid = {
    1: Boolean(materialCode),
    2: width > 0 && height > 0 && quantity > 0,
    3: artworkReady,
  };

  return (
    <div className="configurator">
      {/* Progress rail */}
      <nav className="cfg-rail" aria-label="Configurator progress">
        {([1, 2, 3] as Step[]).map((s, i) => (
          <React.Fragment key={s}>
            <button
              type="button"
              className={`cfg-rail-step ${step === s ? "is-active" : ""} ${step > s ? "is-done" : ""}`}
              onClick={() => s < step && setStep(s)}
              disabled={s > step}
            >
              <span className="cfg-rail-num">{step > s ? <Check size={16} /> : s}</span>
              <span className="cfg-rail-label">{STEP_LABELS[s]}</span>
            </button>
            {i < 2 && (
              <span className={`cfg-rail-line ${step > s ? "is-filled" : ""}`}>
                <i />
              </span>
            )}
          </React.Fragment>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.section
            key="step1"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="cfg-step-head">
              <span className="cfg-eyebrow">Step 1 of 3</span>
              <h1>What are you making?</h1>
              <p>Pick the job and we'll recommend the right material and starting size. You can change either.</p>
            </div>

            <div className="cfg-outcomes">
              {OUTCOMES.map((o, i) => (
                <motion.button
                  key={o.slug}
                  type="button"
                  className={`cfg-outcome-tile ${outcomeSlug === o.slug ? "is-active" : ""}`}
                  onClick={() => handleOutcomeSelect(o.slug)}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="cfg-outcome-num">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{o.label}</h3>
                  <p>{o.blurb}</p>
                  <span className="cfg-outcome-arrow" aria-hidden="true">
                    <ArrowRight size={14} />
                  </span>
                </motion.button>
              ))}
            </div>

            <p className="cfg-know-material">
              Already know your material?{" "}
              <button type="button" onClick={handleSkipToMaterial}>
                Browse all substrates directly
              </button>
            </p>

            {showAllMaterials && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ marginTop: 24 }}>
                <MaterialGrid
                  materials={materials}
                  loading={materialsLoading}
                  error={materialsError}
                  selectedCode={materialCode}
                  onSelect={(code) => {
                    setMaterialCode(code);
                    setStep(2);
                  }}
                />
              </motion.div>
            )}
          </motion.section>
        )}

        {step === 2 && (
          <motion.section
            key="step2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="cfg-step-head">
              <span className="cfg-eyebrow">Step 2 of 3</span>
              <h1>Size it up.</h1>
              <p>Tap a common size, or set exact dimensions. The preview scales as you go.</p>
            </div>

            {selectedMaterial && (
              <div className="cfg-recommend" style={{ marginBottom: 32 }}>
                <div className="cfg-recommend-swatch" aria-hidden="true">
                  {selectedMaterial.category.slice(0, 2).toUpperCase()}
                </div>
                <div className="cfg-recommend-body">
                  <span className="cfg-recommend-kicker">
                    {outcome ? "Recommended for you" : "Selected material"}
                  </span>
                  <h3>{selectedMaterial.name}</h3>
                  <p>{selectedMaterial.description}</p>
                </div>
                <div className="cfg-recommend-rate">
                  <strong>GH₵{(selectedMaterial.ratePesewasPerSqFt / 100).toFixed(2)}</strong>
                  <span>per sq ft</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAllMaterials((v) => !v)}
              className="cfg-know-material"
              style={{ display: "block", marginBottom: 20, background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              <Palette size={13} style={{ verticalAlign: -2, marginRight: 4 }} aria-hidden="true" />
              {showAllMaterials ? "Hide material options" : "Change material"}
            </button>

            {showAllMaterials && (
              <div style={{ marginBottom: 28 }}>
                <MaterialGrid
                  materials={relevantMaterials}
                  loading={materialsLoading}
                  error={materialsError}
                  selectedCode={materialCode}
                  onSelect={setMaterialCode}
                />
              </div>
            )}

            <div className="cfg-dim-layout">
              <div>
                {outcome && (
                  <div className="cfg-presets">
                    {outcome.presets.map((preset) => {
                      const active = preset.width === width && preset.height === height && preset.unit === unit;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          className={`cfg-preset-chip ${active ? "is-active" : ""}`}
                          onClick={() => applyPreset(preset)}
                        >
                          {preset.label}
                          <small>
                            {preset.width}×{preset.height}
                            {preset.unit}
                          </small>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="cfg-numeric-row">
                  <div className="cfg-dim-field">
                    <label htmlFor="cfg-width">Width</label>
                    <input
                      id="cfg-width"
                      type="number"
                      min="0.1"
                      step={unit === "in" ? "0.5" : "0.5"}
                      value={width || ""}
                      onChange={(e) => setWidth(Math.max(0.1, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                  <span className="cfg-dim-times">×</span>
                  <div className="cfg-dim-field">
                    <label htmlFor="cfg-height">Height</label>
                    <input
                      id="cfg-height"
                      type="number"
                      min="0.1"
                      step={unit === "in" ? "0.5" : "0.5"}
                      value={height || ""}
                      onChange={(e) => setHeight(Math.max(0.1, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                  <div className="cfg-unit-toggle" role="group" aria-label="Dimension unit">
                    <button type="button" className={unit === "ft" ? "is-active" : ""} onClick={() => setUnit("ft")}>
                      ft
                    </button>
                    <button type="button" className={unit === "in" ? "is-active" : ""} onClick={() => setUnit("in")}>
                      in
                    </button>
                  </div>
                </div>

                <div className="cfg-area-readout">
                  <Ruler size={13} style={{ verticalAlign: -2, marginRight: 4 }} aria-hidden="true" />
                  <strong>{estimate?.areaPerPieceSqFt ?? "0"} sq ft</strong> per piece
                </div>

                <div style={{ marginTop: 32 }}>
                  <label className="cfg-dim-field" style={{ display: "block" }}>
                    <span style={{ display: "block", marginBottom: 8 }}>Quantity</span>
                  </label>
                  <div className="cfg-qty-row">
                    <Stepper value={quantity} onStep={(d) => setQuantity((q) => Math.max(1, q + d))} label="print quantity" />
                    <span style={{ fontSize: "var(--t-small)", color: "var(--ink-muted)" }}>
                      Total area: <strong>{estimate?.totalAreaSqFt ?? "0"} sq ft</strong>
                    </span>
                  </div>
                </div>
              </div>

              <motion.div
                className="cfg-canvas"
                aria-label="Proportional size preview"
                layout
              >
                <svg width="26" height="64" viewBox="0 0 26 64" className="cfg-canvas-figure" aria-hidden="true">
                  <circle cx="13" cy="8" r="7" fill="currentColor" opacity="0.5" />
                  <rect x="5" y="17" width="16" height="34" rx="6" fill="currentColor" opacity="0.5" />
                  <rect x="3" y="50" width="8" height="13" rx="3" fill="currentColor" opacity="0.5" />
                  <rect x="15" y="50" width="8" height="13" rx="3" fill="currentColor" opacity="0.5" />
                </svg>
                <motion.div
                  className="cfg-canvas-shape"
                  animate={{ width: canvasDims.width, height: canvasDims.height }}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                >
                  <span>
                    <Maximize2 size={10} style={{ verticalAlign: -1, marginRight: 3 }} aria-hidden="true" />
                    {width}
                    {unit} × {height}
                    {unit}
                  </span>
                </motion.div>
                <span className="cfg-canvas-caption">Proportional preview against a 5'9" reference height</span>
              </motion.div>
            </div>

            <div className="cfg-step-nav">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                <ArrowLeft aria-hidden="true" />
                <span>Back</span>
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setStep(3)} disabled={!stepValid[2]}>
                <span>Continue to artwork</span>
                <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </motion.section>
        )}

        {step === 3 && (
          <motion.section
            key="step3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="cfg-step-head">
              <span className="cfg-eyebrow">Step 3 of 3</span>
              <h1>Send us the artwork.</h1>
              <p>Upload a file, share a link, ask our studio to design it, or send it later on WhatsApp.</p>
            </div>

            <label className={`cfg-design-toggle ${needsDesign ? "is-selected" : ""}`}>
              <input type="checkbox" checked={needsDesign} onChange={(e) => setNeedsDesign(e.target.checked)} style={{ marginTop: 3 }} />
              <div>
                <strong>I need Vikipat to design or redesign my artwork</strong>
                <p>
                  Our studio designers create print-ready files for you (+GH₵
                  {selectedMaterial ? (selectedMaterial.designMinimumPesewas / 100).toFixed(0) : "100"} min, confirmed after brief review).
                </p>
              </div>
            </label>

            <div className="cfg-artwork-grid">
              <button type="button" className={`cfg-artwork-btn ${artworkOption === "upload" ? "is-active" : ""}`} onClick={() => setArtworkOption("upload")}>
                <FileUp size={18} color="var(--brand-primary)" style={{ marginBottom: 6 }} aria-hidden="true" />
                <strong>Upload file</strong>
                <span>PDF, AI, EPS, 300 DPI PNG/JPG</span>
              </button>
              <button type="button" className={`cfg-artwork-btn ${artworkOption === "link" ? "is-active" : ""}`} onClick={() => setArtworkOption("link")}>
                <LinkIcon size={18} color="var(--brand-primary)" style={{ marginBottom: 6 }} aria-hidden="true" />
                <strong>Cloud link</strong>
                <span>Drive, WeTransfer, Dropbox</span>
              </button>
              <button type="button" className={`cfg-artwork-btn ${artworkOption === "design_service" ? "is-active" : ""}`} onClick={() => setArtworkOption("design_service")}>
                <HelpCircle size={18} color="var(--brand-primary)" style={{ marginBottom: 6 }} aria-hidden="true" />
                <strong>Design for me</strong>
                <span>Studio creates it from scratch</span>
              </button>
              <button type="button" className={`cfg-artwork-btn ${artworkOption === "later" ? "is-active" : ""}`} onClick={() => setArtworkOption("later")}>
                <Check size={18} color="var(--brand-primary)" style={{ marginBottom: 6 }} aria-hidden="true" />
                <strong>Send it later</strong>
                <span>Attach in chat after ordering</span>
              </button>
            </div>

            {artworkOption === "upload" && (
              <div style={{ marginTop: 20 }}>
                <label htmlFor="cfg-artwork-file" className="artwork-dropzone" style={{ display: "block" }}>
                  <UploadCloud aria-hidden="true" />
                  <p style={{ fontWeight: 700, color: "var(--brand-primary)" }}>
                    {uploading ? "Uploading your artwork..." : "Click to select or drag & drop artwork file"}
                  </p>
                  <span style={{ fontSize: "var(--t-micro)", color: "var(--ink-subtle)" }}>Supports PDF, JPG, PNG, WebP up to 10MB</span>
                  <input id="cfg-artwork-file" type="file" style={{ display: "none" }} accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileUpload} disabled={uploading} />
                </label>
                {artworkName && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, background: "var(--success-soft)", padding: "8px 14px", borderRadius: "var(--r-md)", color: "var(--success-deep, var(--success))" }}>
                    <FileCheck size={16} aria-hidden="true" />
                    <span style={{ fontSize: "var(--t-small)", fontWeight: 600 }}>Attached: {artworkName}</span>
                  </div>
                )}
                {uploadError && <p style={{ color: "var(--danger)", fontSize: "var(--t-small)", marginTop: 8 }}>{uploadError}</p>}
              </div>
            )}

            {artworkOption === "link" && (
              <div style={{ marginTop: 20 }}>
                <label htmlFor="cfg-artwork-link" className="label-micro">
                  Paste public shareable link
                </label>
                <input
                  id="cfg-artwork-link"
                  type="url"
                  className="input"
                  placeholder="https://drive.google.com/..."
                  value={artworkLink}
                  onChange={(e) => setArtworkLink(e.target.value)}
                />
              </div>
            )}

            {!artworkReady && (
              <p style={{ marginTop: 16, fontSize: "var(--t-small)", color: "var(--danger)" }}>
                {artworkOption === "upload"
                  ? "Attach a file above, or choose a different artwork option, to continue."
                  : "Paste a shareable link above to continue."}
              </p>
            )}

            <div style={{ marginTop: 24 }}>
              <label htmlFor="cfg-notes" className="label-micro">
                Notes for the production team (optional)
              </label>
              <input
                id="cfg-notes"
                type="text"
                className="input"
                placeholder="e.g. eyelets on all 4 corners, matte lamination"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="cfg-step-nav">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
                <ArrowLeft aria-hidden="true" />
                <span>Back</span>
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Sticky live price ticker, visible from step 2 onward */}
      {step >= 2 && estimate && (
        <motion.div className="cfg-ticker" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <dl className="cfg-ticker-figures">
            <div>
              <dt>Rate</dt>
              <dd>GH₵{(estimate.ratePesewasPerSqFt / 100).toFixed(2)}/sq ft</dd>
            </div>
            <div>
              <dt>Area</dt>
              <dd>{estimate.totalAreaSqFt} sq ft</dd>
            </div>
            {estimate.designFeePesewas > 0 && (
              <div>
                <dt>Design</dt>
                <dd>+GH₵{(estimate.designFeePesewas / 100).toFixed(2)}</dd>
              </div>
            )}
          </dl>
          <div className="cfg-ticker-total">
            <span style={{ fontSize: "var(--t-micro)", color: "var(--ink-inverse-muted)" }}>
              {pricing ? "Pricing…" : "Estimated total"}
            </span>
            <div className="cfg-total-value">GH₵{(estimate.totalPesewas / 100).toFixed(2)}</div>
          </div>
          <div className="cfg-ticker-actions">
            {step < 3 ? (
              <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
                Continue <ArrowRight aria-hidden="true" />
              </button>
            ) : (
              <>
                <button type="button" className="btn btn-secondary" onClick={() => handleAddJob(false)} disabled={!artworkReady}>
                  {addedNotice ? (
                    <>
                      <Check aria-hidden="true" /> <span>Added!</span>
                    </>
                  ) : (
                    <span>Add to order</span>
                  )}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => handleAddJob(true)} disabled={!artworkReady}>
                  <span>Checkout</span>
                  <ArrowRight aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function MaterialGrid({
  materials,
  loading,
  error,
  selectedCode,
  onSelect,
}: {
  materials: PrintMaterial[];
  loading: boolean;
  error: string | null;
  selectedCode?: string;
  onSelect: (code: string) => void;
}) {
  if (loading) {
    return <p className="muted">Loading materials…</p>;
  }
  if (error) {
    return <p style={{ color: "var(--danger)" }}>{error}</p>;
  }
  return (
    <div className="cfg-material-grid">
      {materials.map((m) => (
        <button
          key={m.code}
          type="button"
          className={`cfg-material-card ${selectedCode === m.code ? "is-active" : ""}`}
          onClick={() => onSelect(m.code)}
        >
          <div className="cfg-material-card-top">
            <strong>{m.name}</strong>
            <span className="cfg-material-rate-tag">GH₵{(m.ratePesewasPerSqFt / 100).toFixed(2)}/sq ft</span>
          </div>
          <p>{m.description}</p>
        </button>
      ))}
    </div>
  );
}
