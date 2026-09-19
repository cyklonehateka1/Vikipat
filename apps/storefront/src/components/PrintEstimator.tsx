import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Info,
  Maximize2,
  Paintbrush,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  CalculatedEstimate,
  DimensionUnit,
  LARGE_FORMAT_MATERIALS,
  LargeFormatMaterial,
} from "../types/pricing";
import { computeLocalEstimate, fetchServerEstimate } from "../lib/calculator";
import { useOrder } from "../order";
import { Stepper } from "./Primitives";
import "../styles/estimator.css";

interface PrintEstimatorProps {
  compact?: boolean;
  initialMaterial?: string;
  onJobAdded?: (jobId: string) => void;
}

export function PrintEstimator({
  compact = false,
  initialMaterial = "flexy-banner",
  onJobAdded,
}: PrintEstimatorProps) {
  const navigate = useNavigate();
  const { addCustomJob, openDrawer } = useOrder();

  const [selectedMaterial, setSelectedMaterial] = useState<LargeFormatMaterial>(
    () => {
      return (
        LARGE_FORMAT_MATERIALS.find((m) => m.code === initialMaterial) ||
        LARGE_FORMAT_MATERIALS[0]
      );
    },
  );

  const [width, setWidth] = useState<number>(compact ? 3 : 4);
  const [height, setHeight] = useState<number>(compact ? 2 : 3);
  const [unit, setUnit] = useState<DimensionUnit>("ft");
  const [quantity, setQuantity] = useState<number>(1);
  const [needsDesign, setNeedsDesign] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");

  const [estimate, setEstimate] = useState<CalculatedEstimate>(() => {
    return computeLocalEstimate(
      initialMaterial,
      width,
      height,
      unit,
      quantity,
      needsDesign,
    );
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [addedNotice, setAddedNotice] = useState<boolean>(false);

  // Sync estimate whenever inputs change
  useEffect(() => {
    let cancelled = false;
    const updateQuote = async () => {
      // Local instant feedback
      const local = computeLocalEstimate(
        selectedMaterial.code,
        width,
        height,
        unit,
        quantity,
        needsDesign,
      );
      if (!cancelled) setEstimate(local);

      // Async server estimate
      setLoading(true);
      try {
        const serverEstimate = await fetchServerEstimate(
          selectedMaterial.code,
          width,
          height,
          unit,
          quantity,
          needsDesign,
        );
        if (!cancelled) {
          setEstimate(serverEstimate);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    updateQuote();
    return () => {
      cancelled = true;
    };
  }, [selectedMaterial.code, width, height, unit, quantity, needsDesign]);

  // Compute visual aspect ratio representation
  const aspectStyle = useMemo(() => {
    const ratio = (width || 1) / (height || 1);
    let boxW = 140;
    let boxH = 90;

    if (ratio >= 1) {
      boxW = Math.min(200, Math.max(90, 110 * ratio));
      boxH = Math.round(boxW / ratio);
      if (boxH > 130) {
        boxH = 130;
        boxW = Math.round(boxH * ratio);
      }
    } else {
      boxH = Math.min(130, Math.max(80, 110 / ratio));
      boxW = Math.round(boxH * ratio);
    }

    return { width: `${boxW}px`, height: `${boxH}px` };
  }, [width, height]);

  const handleAddJob = (proceedToCheckout = false) => {
    const jobId = addCustomJob({
      estimate,
      artworkOption: needsDesign ? "design_service" : "later",
      notes,
    });

    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2400);

    if (onJobAdded) {
      onJobAdded(jobId);
    }

    if (proceedToCheckout) {
      navigate("/checkout");
    } else {
      openDrawer();
    }
  };

  return (
    <div className={`estimator-card ${compact ? "is-compact" : ""}`}>
      <div className="estimator-header">
        <div>
          <h2>
            <span>Interactive Large Format Estimator</span>
          </h2>
          <p>
            Instant pricing backed by Vikipat’s official production rates.
            Verified to the nearest cedi.
          </p>
        </div>
        <div className="estimator-badge">
          <span>CMYK Pre-Flight Included</span>
        </div>
      </div>

      <div className="estimator-body">
        {/* Step 1: Material Selection */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
            }}
          >
            <label
              className="label-micro"
              style={{ color: "var(--brand-primary)" }}
            >
              1. Select Substrate / Material
            </label>
            <span
              style={{ fontSize: "var(--t-micro)", color: "var(--ink-subtle)" }}
            >
              {LARGE_FORMAT_MATERIALS.length} verified commercial substrates
            </span>
          </div>

          <div className="material-selector-grid">
            {LARGE_FORMAT_MATERIALS.slice(
              0,
              compact ? 4 : LARGE_FORMAT_MATERIALS.length,
            ).map((mat) => {
              const active = selectedMaterial.code === mat.code;
              return (
                <button
                  type="button"
                  key={mat.code}
                  className={`material-chip ${active ? "is-active" : ""}`}
                  onClick={() => setSelectedMaterial(mat)}
                >
                  {mat.badge && (
                    <span className="material-chip-tag">{mat.badge}</span>
                  )}
                  <div className="material-chip-top">
                    <span className="material-chip-name">{mat.name}</span>
                    <span className="material-chip-rate">
                      GH₵ {(mat.walkInRatePesewas / 100).toFixed(2)}/sq ft
                    </span>
                  </div>
                  <p className="material-chip-desc">{mat.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Dimensions & Visual Aspect Canvas */}
        <div className="dimensions-section">
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <label
                className="label-micro"
                style={{ color: "var(--brand-primary)" }}
              >
                2. Specify Exact Dimensions
              </label>
              <div
                className="unit-toggle"
                role="group"
                aria-label="Dimension Unit"
              >
                <button
                  type="button"
                  className={unit === "ft" ? "is-active" : ""}
                  onClick={() => setUnit("ft")}
                >
                  Feet (ft)
                </button>
                <button
                  type="button"
                  className={unit === "in" ? "is-active" : ""}
                  onClick={() => setUnit("in")}
                >
                  Inches (in)
                </button>
              </div>
            </div>

            <div className="dimension-inputs-grid">
              <div className="dimension-field">
                <label htmlFor="dim-width">Width</label>
                <div className="dimension-input-wrap">
                  <input
                    id="dim-width"
                    type="number"
                    min="0.5"
                    step={unit === "in" ? "1" : "0.5"}
                    value={width || ""}
                    onChange={(e) =>
                      setWidth(Math.max(0.1, parseFloat(e.target.value) || 0))
                    }
                  />
                  <span className="dimension-unit-badge">{unit}</span>
                </div>
              </div>

              <div className="dimension-field">
                <label htmlFor="dim-height">Height</label>
                <div className="dimension-input-wrap">
                  <input
                    id="dim-height"
                    type="number"
                    min="0.5"
                    step={unit === "in" ? "1" : "0.5"}
                    value={height || ""}
                    onChange={(e) =>
                      setHeight(Math.max(0.1, parseFloat(e.target.value) || 0))
                    }
                  />
                  <span className="dimension-unit-badge">{unit}</span>
                </div>
              </div>
            </div>

            <p
              style={{
                fontSize: "var(--t-micro)",
                color: "var(--ink-subtle)",
                marginTop: "8px",
              }}
            >
              Tip: Standard roll-up banners in Accra are typically{" "}
              <strong>2.7ft × 6.5ft (33in × 78in)</strong>. Standard
              billboards/backdrops are <strong>8ft × 8ft</strong> or{" "}
              <strong>10ft × 8ft</strong>.
            </p>
          </div>

          {/* Real-time aspect canvas representation */}
          <div
            className="aspect-canvas-wrapper"
            aria-label="Visual aspect preview"
          >
            <div className="aspect-preview-box" style={aspectStyle}>
              <span>
                {width}
                {unit} × {height}
                {unit}
              </span>
              <span className="aspect-badge">
                <Maximize2
                  aria-hidden="true"
                  style={{
                    width: 10,
                    height: 10,
                    display: "inline",
                    marginRight: 3,
                  }}
                />
                {estimate.areaPerPieceSqFt} sq ft
              </span>
            </div>
            <span
              style={{
                fontSize: "0.65rem",
                color: "var(--ink-faint)",
                marginTop: "8px",
              }}
            >
              Proportional preview
            </span>
          </div>
        </div>

        {/* Step 3: Quantity & Design Configuration */}
        <div className="config-options-grid">
          <div>
            <label
              className="label-micro"
              style={{
                display: "block",
                marginBottom: "8px",
                color: "var(--brand-primary)",
              }}
            >
              3. Quantity / Copies
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <Stepper
                value={quantity}
                onStep={(delta) => setQuantity((q) => Math.max(1, q + delta))}
                label="Job Quantity"
              />
              <span
                style={{
                  fontSize: "var(--t-small)",
                  color: "var(--ink-muted)",
                }}
              >
                Total Area: <strong>{estimate.totalAreaSqFt} sq ft</strong>
              </span>
            </div>
          </div>

          <div>
            <label
              className="label-micro"
              style={{
                display: "block",
                marginBottom: "8px",
                color: "var(--brand-primary)",
              }}
            >
              4. Graphic Design Requirement
            </label>
            <label
              className={`design-service-card ${needsDesign ? "is-selected" : ""}`}
            >
              <input
                type="checkbox"
                checked={needsDesign}
                onChange={(e) => setNeedsDesign(e.target.checked)}
              />
              <div className="design-service-info">
                <strong>
                  I need Vikipat to design or redesign my artwork (+GH₵100 min)
                </strong>
                <p>
                  Our senior studio graphic designers will create
                  high-resolution, print-ready files tailored to your branding
                  guidelines.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Live Calculation Output Ticker Bar */}
        <div className="estimate-ticker">
          <div className="estimate-breakdown-list">
            <dl className="estimate-stat">
              <dt>Material Rate</dt>
              <dd>
                GH₵ {(estimate.ratePesewasPerSqFt / 100).toFixed(2)}/sq ft
              </dd>
            </dl>

            <dl className="estimate-stat">
              <dt>Total Area</dt>
              <dd>{estimate.totalAreaSqFt} sq ft</dd>
            </dl>

            <dl className="estimate-stat">
              <dt>Base Printing</dt>
              <dd>GH₵ {(estimate.basePesewas / 100).toFixed(2)}</dd>
            </dl>

            {estimate.designFeePesewas > 0 && (
              <dl className="estimate-stat">
                <dt>Design Service</dt>
                <dd style={{ color: "var(--accent-cyan)" }}>
                  +GH₵ {(estimate.designFeePesewas / 100).toFixed(2)}
                </dd>
              </dl>
            )}
          </div>

          <div className="estimate-total-block">
            <span className="estimate-total-label">Authoritative Estimate</span>
            <div className="estimate-total-price">
              GH₵ {(estimate.totalPesewas / 100).toFixed(2)}
            </div>
            {estimate.requiresReview && (
              <span
                style={{
                  fontSize: "var(--t-micro)",
                  color: "#fef08a",
                  marginTop: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Info aria-hidden="true" style={{ width: 12, height: 12 }} />
                <span>Design fee provisional • Staff review required</span>
              </span>
            )}
          </div>
        </div>

        {/* Quick Add & Direct Order Buttons */}
        <div className="estimate-actions">
          <button
            type="button"
            className="btn btn-secondary btn-lg"
            onClick={() => handleAddJob(false)}
            style={{ flex: 1 }}
          >
            {addedNotice ? (
              <>
                <Check aria-hidden="true" style={{ color: "var(--success)" }} />
                <span>Added to Quote List!</span>
              </>
            ) : (
              <>
                <Plus aria-hidden="true" />
                <span>Add to Quote / Order List</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={() => handleAddJob(true)}
            style={{ flex: 1.2 }}
          >
            <span>Proceed to Checkout</span>
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
