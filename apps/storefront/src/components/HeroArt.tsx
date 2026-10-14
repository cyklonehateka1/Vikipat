import { useId } from 'react';

/**
 * Vector illustrations for the home hero. Everything is drawn here as inline
 * SVG (no photographs): flat shapes, soft gradients and a little gloss, so the
 * objects read as glossy 3D-ish print-shop props. Each piece takes its own
 * gradient ids from useId, so a piece can appear more than once on a page.
 */
const useUid = () => useId().replace(/[^a-zA-Z0-9]/g, '');

const STAR = '50,26 55.8,40.6 71.5,41.6 59.5,51.6 63.4,66.9 50,58.4 36.6,66.9 40.5,51.6 28.5,41.6 44.2,40.6';
const SHIRT =
  'M42 6 L14 20 L2 50 L26 58 L32 46 V106 H88 V46 L94 58 L118 50 L106 20 L78 6 C74 18 66 22 60 22 C54 22 46 18 42 6Z';

/** A printer with a colourful sheet sliding out of it. Local box 120 x 100. */
function Printer() {
  const u = useUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c9d1c5" />
        </linearGradient>
        <linearGradient id={`${u}l`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f7f2" />
          <stop offset="1" stopColor="#dbe1d7" />
        </linearGradient>
        <linearGradient id={`${u}p`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff7a2e" />
          <stop offset="0.5" stopColor="#ffc21a" />
          <stop offset="1" stopColor="#2ea54a" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="94" rx="46" ry="4" fill="#000" opacity="0.22" />
      <rect x="34" y="2" width="52" height="50" rx="4" fill="#fff" />
      <rect x="40" y="9" width="40" height="10" rx="2.5" fill={`url(#${u}p)`} />
      <rect x="40" y="24" width="28" height="4" rx="2" fill="#d5dbd1" />
      <rect x="40" y="32" width="34" height="4" rx="2" fill="#d5dbd1" />
      <rect x="8" y="40" width="104" height="48" rx="14" fill={`url(#${u}b)`} />
      <path d="M22 40 H98 A14 14 0 0 1 112 54 V58 H8 V54 A14 14 0 0 1 22 40Z" fill={`url(#${u}l)`} />
      <rect x="16" y="47" width="30" height="4" rx="2" fill="#bcc4b8" />
      <circle cx="90" cy="49" r="3.2" fill="#2ea54a" />
      <circle cx="101" cy="49" r="3.2" fill="#2563eb" />
      <rect x="22" y="62" width="76" height="10" rx="5" fill="#1f231f" />
      <rect x="26" y="64" width="68" height="2" rx="1" fill="#fff" opacity="0.18" />
    </g>
  );
}

/** A T-shirt with a printed star. Local box 120 x 112. `tone` picks white or blue cloth. */
function Shirt({ tone }: { tone: 'white' | 'blue' }) {
  const u = useUid();
  const white = tone === 'white';
  return (
    <g>
      <defs>
        <linearGradient id={`${u}f`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={white ? '#ffffff' : '#7cb8ff'} />
          <stop offset="1" stopColor={white ? '#d5dded' : '#2b66e6'} />
        </linearGradient>
        <linearGradient id={`${u}g`} x1="0" y1="0" x2="0.7" y2="0.7">
          <stop offset="0" stopColor="#fff" stopOpacity="0.6" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${u}s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb06e" />
          <stop offset="1" stopColor="#ff5a0a" />
        </linearGradient>
      </defs>
      <path d={SHIRT} fill={`url(#${u}f)`} />
      <path d="M2 50 L14 20 L42 6 L44 30 L32 46 L26 58Z" fill="#1d4fc0" opacity={white ? 0.1 : 0.16} />
      <path d="M118 50 L106 20 L78 6 L76 30 L88 46 L94 58Z" fill="#1d4fc0" opacity={white ? 0.06 : 0.1} />
      <path d={SHIRT} fill={`url(#${u}g)`} />
      <path d="M42 6 C46 18 54 22 60 22 C66 22 74 18 78 6" fill="none" stroke={white ? '#2b66e6' : '#1d4fc0'} strokeWidth="4" strokeLinecap="round" />
      <path d="M32 100 H88" stroke="#000" strokeOpacity="0.08" strokeWidth="2" strokeDasharray="4 4" />
      <g transform="translate(20 20) scale(0.8)">
        <polygon points={STAR} fill={white ? `url(#${u}s)` : '#fff'} />
      </g>
    </g>
  );
}

/** Three glossy ink drops. Box 100 x 100. */
export function InkDropsArt() {
  const u = useUid();
  const drop = 'M50 6 C50 6 22 40 22 60 A28 28 0 0 0 78 60 C78 40 50 6 50 6Z';
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}1`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6fd0ff" />
          <stop offset="1" stopColor="#1177bf" />
        </linearGradient>
        <linearGradient id={`${u}2`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffbf7a" />
          <stop offset="1" stopColor="#f0701a" />
        </linearGradient>
        <linearGradient id={`${u}3`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff7fa8" />
          <stop offset="1" stopColor="#c42a5c" />
        </linearGradient>
      </defs>
      <g transform="translate(-2 26) scale(0.6)">
        <path d={drop} fill={`url(#${u}1)`} />
        <ellipse cx="40" cy="48" rx="6" ry="11" fill="#fff" opacity="0.5" transform="rotate(18 40 48)" />
      </g>
      <g transform="translate(40 30) scale(0.6)">
        <path d={drop} fill={`url(#${u}2)`} />
        <ellipse cx="40" cy="48" rx="6" ry="11" fill="#fff" opacity="0.5" transform="rotate(18 40 48)" />
      </g>
      <g transform="translate(19 -2) scale(0.7)">
        <path d={drop} fill={`url(#${u}3)`} />
        <ellipse cx="40" cy="46" rx="7" ry="13" fill="#fff" opacity="0.5" transform="rotate(18 40 46)" />
      </g>
    </svg>
  );
}

/** A price tag with a hole and string. Box 100 x 100. */
export function TagArt() {
  const u = useUid();
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}t`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb06e" />
          <stop offset="1" stopColor="#ff5a0a" />
        </linearGradient>
      </defs>
      <g transform="rotate(-18 50 50)">
        <path d="M12 30 H52 L82 50 L52 70 H12 Q6 70 6 64 V36 Q6 30 12 30Z" fill={`url(#${u}t)`} />
        <path d="M12 30 H52 L82 50 L52 70" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="2" />
        <circle cx="19" cy="50" r="5.5" fill="#fff" />
        <circle cx="19" cy="50" r="5.5" fill="none" stroke="#c94a08" strokeOpacity="0.4" />
        <path d="M14 46 C6 34 10 18 24 14" fill="none" stroke="#ff7a2e" strokeWidth="2.4" strokeLinecap="round" />
        <text x="30" y="60" fontFamily="Inter, sans-serif" fontSize="30" fontWeight="800" fill="#fff">
          ₵
        </text>
      </g>
    </svg>
  );
}

/** A printed mug. Box 100 x 100. */
export function MugArt() {
  const u = useUid();
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}m`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c9d6ef" />
        </linearGradient>
        <linearGradient id={`${u}o`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffa25c" />
          <stop offset="1" stopColor="#ff5a0a" />
        </linearGradient>
      </defs>
      <path d="M32 14 C26 20 38 22 32 30" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="3" strokeLinecap="round" />
      <path d="M46 10 C40 18 52 20 46 30" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="3" strokeLinecap="round" />
      <path d="M66 42 h6 a13 13 0 0 1 0 26 h-6" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <rect x="18" y="32" width="50" height="56" rx="10" fill={`url(#${u}m)`} />
      <rect x="18" y="50" width="50" height="18" fill={`url(#${u}o)`} />
      <g transform="translate(23 39) scale(0.4)">
        <polygon points={STAR} fill="#fff" />
      </g>
      <rect x="24" y="36" width="6" height="48" rx="3" fill="#fff" opacity="0.55" />
      <ellipse cx="43" cy="32" rx="25" ry="5" fill="#dfe6f3" />
      <ellipse cx="43" cy="32" rx="21" ry="3.4" fill="#7a4b2a" />
    </svg>
  );
}

/** Card: a typography specimen with bezier handles. Box 100 x 133. */
export function TypeCardArt() {
  return (
    <svg viewBox="0 0 100 133" aria-hidden="true">
      <text x="50" y="72" textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize="58" fill="#fff">
        Aa
      </text>
      <path d="M12 100 C 32 80, 68 120, 88 98" fill="none" stroke="#fff" strokeWidth="2" />
      <path d="M12 100 L 32 80 M88 98 L 68 120" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.2" />
      <rect x="9" y="97" width="6" height="6" fill="#fff" />
      <rect x="85" y="95" width="6" height="6" fill="#fff" />
      <circle cx="32" cy="80" r="3" fill="#fff" />
      <circle cx="68" cy="120" r="3" fill="#fff" />
    </svg>
  );
}

/** Card: a brand card with monogram and logo dots. Box 100 x 133. */
export function BrandCardArt() {
  const u = useUid();
  return (
    <svg viewBox="0 0 100 133" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}c`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffa25c" />
          <stop offset="1" stopColor="#ff5a0a" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="48" r="24" fill={`url(#${u}c)`} />
      <text x="50" y="58" textAnchor="middle" fontFamily="Montserrat, sans-serif" fontSize="30" fontWeight="800" fill="#fff">
        V
      </text>
      <circle cx="26" cy="96" r="6.5" fill="#1177bf" />
      <circle cx="43" cy="96" r="6.5" fill="#2ea54a" />
      <circle cx="60" cy="96" r="6.5" fill="#f38432" />
      <circle cx="77" cy="96" r="6.5" fill="#c42a5c" />
      <rect x="20" y="112" width="44" height="4" rx="2" fill="#c8cfc4" />
    </svg>
  );
}

/** Card: a printer with a print sliding out. Box 100 x 133. */
export function PrinterCardArt() {
  return (
    <svg viewBox="0 0 100 133" aria-hidden="true">
      <g transform="translate(7 30) scale(0.72)">
        <Printer />
      </g>
    </svg>
  );
}

/** Card: a shirt with a printed star. Box 100 x 133. */
export function ShirtCardArt() {
  return (
    <svg viewBox="0 0 100 133" aria-hidden="true">
      <g transform="translate(8 30) scale(0.7)">
        <Shirt tone="white" />
      </g>
    </svg>
  );
}

/** Floater: a blue shirt with a white star. */
export function ShirtArt() {
  return (
    <svg viewBox="0 0 120 112" aria-hidden="true">
      <Shirt tone="blue" />
    </svg>
  );
}

/** Floater: a fan of colour-swatch chips on one rivet. */
export function SwatchFanArt() {
  const u = useUid();
  const chips = [
    { angle: 46, from: '#7ee0a8', to: '#2ea54a' },
    { angle: 23, from: '#7cb8ff', to: '#2b66e6' },
    { angle: 0, from: '#ffa25c', to: '#ff5a0a' },
  ];
  return (
    <svg viewBox="0 0 150 140" aria-hidden="true">
      <defs>
        {chips.map((chip, index) => (
          <linearGradient key={chip.angle} id={`${u}${index}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={chip.from} />
            <stop offset="1" stopColor={chip.to} />
          </linearGradient>
        ))}
      </defs>
      {chips.map((chip, index) => (
        <g key={chip.angle} transform={`rotate(${chip.angle} 28 122)`}>
          <rect x="12" y="10" width="34" height="116" rx="9" fill="#fff" />
          <path d="M12 19 A9 9 0 0 1 21 10 H37 A9 9 0 0 1 46 19 V68 H12Z" fill={`url(#${u}${index})`} />
          <rect x="18" y="78" width="22" height="4" rx="2" fill="#d6dcd2" />
          <rect x="18" y="87" width="14" height="4" rx="2" fill="#d6dcd2" />
          <rect x="15" y="14" width="5" height="46" rx="2.5" fill="#fff" opacity="0.35" />
        </g>
      ))}
      <circle cx="28" cy="122" r="6" fill="#1f231f" />
      <circle cx="26.5" cy="120.5" r="2" fill="#fff" opacity="0.5" />
    </svg>
  );
}

/** Floater: a holographic peel-off sticker with a star. */
export function StickerArt() {
  const u = useUid();
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}h`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb06e" />
          <stop offset="0.3" stopColor="#ff6fa8" />
          <stop offset="0.6" stopColor="#8a6bff" />
          <stop offset="1" stopColor="#3fd0ff" />
        </linearGradient>
        <radialGradient id={`${u}r`} cx="0.3" cy="0.25" r="0.7">
          <stop offset="0" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill={`url(#${u}h)`} />
      <circle cx="50" cy="50" r="46" fill={`url(#${u}r)`} />
      <circle cx="50" cy="50" r="38" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="3 4" />
      <polygon points={STAR} fill="#fff" />
      <path d="M100 58 C84 60 66 78 60 100 L100 100 Z" fill="#fff" opacity="0.92" />
      <path d="M100 58 C84 60 66 78 60 100" fill="none" stroke="#dde3d9" strokeWidth="1.5" />
    </svg>
  );
}
