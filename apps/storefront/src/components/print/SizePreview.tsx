/** A person's height, in feet, used for scale (5 ft 9 in). */
const PERSON_FT = 5.75;
const BOX_W = 250;
const BOX_H = 140;

/**
 * The job drawn to scale next to a person, so "8 × 4 ft" means something.
 * Very small jobs (labels in inches) are drawn at a readable minimum size.
 */
export function SizePreview({ width, height, unit }: { width: number; height: number; unit: 'ft' | 'in' }) {
  const wFt = unit === 'in' ? width / 12 : width;
  const hFt = unit === 'in' ? height / 12 : height;
  const scale = Math.min(BOX_H / Math.max(hFt, PERSON_FT), BOX_W / Math.max(wFt, 0.1));
  const rectW = Math.max(14, Math.round(wFt * scale));
  const rectH = Math.max(14, Math.round(hFt * scale));
  const personH = Math.round(PERSON_FT * scale);
  const label = `${width} × ${height} ${unit}`;

  return (
    <figure className="print-preview" aria-label={`${label}, drawn next to a person 5 ft 9 in tall`}>
      <figcaption>Next to a person 5 ft 9 in tall</figcaption>
      <div className="print-preview-stage" aria-hidden="true">
        <svg
          className="print-preview-person"
          width={Math.round((personH * 26) / 64)}
          height={personH}
          viewBox="0 0 26 64"
        >
          <circle cx="13" cy="7" r="6" />
          <rect x="5" y="15" width="16" height="30" rx="6" />
          <rect x="5" y="42" width="7" height="22" rx="3" />
          <rect x="14" y="42" width="7" height="22" rx="3" />
        </svg>
        <span className="print-preview-job" style={{ width: rectW, height: rectH }}>
          {rectW > 64 && rectH > 24 && <span>{label}</span>}
        </span>
      </div>
    </figure>
  );
}
