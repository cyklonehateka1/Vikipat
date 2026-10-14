import { AlertCircle } from 'lucide-react';
import { Outcome } from '../../outcomes';
import { lockedSizes } from '../../lib/materialSizes';
import { PrintMaterial } from '../../types/pricing';
import { Stepper } from '../Primitives';
import { SizePreview } from './SizePreview';
import { SizeState } from './types';

/** Step two: material, size and quantity, with the job drawn to scale. */
export function SizeStep({
  outcome,
  material,
  size,
  setSize,
  qty,
  setQty,
  width,
  height,
  areaPerPiece,
  tooSmall,
  onChangeMaterial,
}: {
  outcome?: Outcome;
  material?: PrintMaterial;
  size: SizeState;
  setSize: (next: SizeState) => void;
  qty: number;
  setQty: (next: number | ((current: number) => number)) => void;
  width: number | null;
  height: number | null;
  areaPerPiece: number | null;
  tooSmall: boolean;
  onChangeMaterial: () => void;
}) {
  // Stock sold in set sizes only shows its own sizes, with no custom option.
  const fixedSizes = lockedSizes(material);
  const presets = fixedSizes ?? outcome?.presets ?? [];
  const custom = !fixedSizes && size.preset === 'custom';
  const widthError = custom && width === null;
  const heightError = custom && height === null;

  return (
    <div className="print-step print-size print-flow">
      <header className="print-head">
        <h1>Choose a size</h1>
        <p>
          {fixedSizes ? 'Pick a size.' : 'Pick a common size or type your own.'} Then tap Calculate price to see the
          total.
        </p>
      </header>

      {material && (
        <section className="print-group">
          <h2 className="print-group-title">Material</h2>
          <div className="opt is-static">
            <span className="opt-icon opt-icon-letter" aria-hidden="true">
              {material.name.slice(0, 1)}
            </span>
            <span className="opt-body">
              <span className="opt-title">{material.name}</span>
              <span className="opt-note">
                {outcome ? 'Suggested for this job.' : ''}
                {fixedSizes ? `${outcome ? ' ' : ''}Comes in set sizes only.` : ''}
              </span>
            </span>
            <button type="button" className="opt-link" onClick={onChangeMaterial}>
              Change
            </button>
          </div>
        </section>
      )}

      <fieldset className="print-fieldset print-group">
        <legend className="print-group-title">Size</legend>
        <div className="print-presets">
          {presets.map((preset) => (
            <label className="print-preset" key={preset.label}>
              <input
                type="radio"
                name="size"
                checked={size.preset === preset.label}
                onChange={() =>
                  setSize({
                    preset: preset.label,
                    widthText: String(preset.width),
                    heightText: String(preset.height),
                    unit: preset.unit,
                  })
                }
              />
              <span className="print-preset-name">{preset.label}</span>
              <span className="print-preset-dims">
                {preset.width} × {preset.height} {preset.unit}
              </span>
            </label>
          ))}
          {!fixedSizes && (
            <label className="print-preset">
              <input
                type="radio"
                name="size"
                checked={custom}
                onChange={() => setSize({ ...size, preset: 'custom' })}
              />
              <span className="print-preset-name">Custom size</span>
              <span className="print-preset-dims">Type your own</span>
            </label>
          )}
        </div>

        {custom && (
          <div className="print-custom">
            <div className="field">
              <label className="field-label" htmlFor="print-width">
                Width
              </label>
              <input
                id="print-width"
                className="input"
                type="number"
                inputMode="decimal"
                min="0.1"
                step="any"
                value={size.widthText}
                aria-invalid={widthError}
                aria-describedby={widthError ? 'print-size-error' : undefined}
                onChange={(event) => setSize({ ...size, widthText: event.target.value })}
              />
            </div>
            <span className="print-times" aria-hidden="true">
              ×
            </span>
            <div className="field">
              <label className="field-label" htmlFor="print-height">
                Height
              </label>
              <input
                id="print-height"
                className="input"
                type="number"
                inputMode="decimal"
                min="0.1"
                step="any"
                value={size.heightText}
                aria-invalid={heightError}
                aria-describedby={heightError ? 'print-size-error' : undefined}
                onChange={(event) => setSize({ ...size, heightText: event.target.value })}
              />
            </div>
            <div className="print-unit" role="group" aria-label="Unit">
              <button
                type="button"
                aria-pressed={size.unit === 'ft'}
                onClick={() => setSize({ ...size, unit: 'ft' })}
              >
                ft
              </button>
              <button
                type="button"
                aria-pressed={size.unit === 'in'}
                onClick={() => setSize({ ...size, unit: 'in' })}
              >
                in
              </button>
            </div>
            {(widthError || heightError) && (
              <p className="field-error print-custom-error" id="print-size-error" role="alert">
                <AlertCircle aria-hidden="true" />
                Enter a width and height between 0.1 and 10,000.
              </p>
            )}
          </div>
        )}
      </fieldset>

      {width !== null && height !== null && <SizePreview width={width} height={height} unit={size.unit} />}

      <div className="print-qty">
        <span className="print-qty-label">
          How many
          {areaPerPiece !== null && (
            <span className="print-qty-note">
              {areaPerPiece} sq ft each
            </span>
          )}
        </span>
        <Stepper
          value={qty}
          max={10000}
          label="pieces"
          onStep={(delta) => setQty((current) => Math.min(10000, Math.max(1, current + delta)))}
          onSet={(value) => setQty(Math.min(10000, value))}
        />
      </div>
      {tooSmall && (
        <p className="field-hint print-too-small" role="status">
          At this size one piece rounds to GH₵0. Add more pieces to get a price.
        </p>
      )}
    </div>
  );
}
