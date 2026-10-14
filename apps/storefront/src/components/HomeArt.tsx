import { useId } from 'react';

/**
 * Vector illustrations for the home page sections below the hero: one per
 * service tile, one per ordering step, and a map of the workshop's street.
 * Inline SVG only, drawn in the hero's language (flat shapes, soft gradients,
 * a little gloss). Gradient ids come from useId so pieces can repeat.
 */
const useUid = () => useId().replace(/[^a-zA-Z0-9]/g, '');

const STAR = '50,26 55.8,40.6 71.5,41.6 59.5,51.6 63.4,66.9 50,58.4 36.6,66.9 40.5,51.6 28.5,41.6 44.2,40.6';

function Stops({ from, to }: { from: string; to: string }) {
  return (
    <>
      <stop offset="0" stopColor={from} />
      <stop offset="1" stopColor={to} />
    </>
  );
}

/* ---------------------------------------------------------------- services */

/** An A-frame sign board. */
export function SignArt() {
  const u = useUid();
  return (
    <svg viewBox="0 0 200 150" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}o`} x1="0" y1="0" x2="1" y2="1">
          <Stops from="#ffa25c" to="#ff5a0a" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="136" rx="60" ry="6" fill="#0e1b14" opacity="0.14" />
      <path d="M70 96 L52 134 M130 96 L148 134" stroke="#3a403b" strokeWidth="7" strokeLinecap="round" />
      <rect x="52" y="22" width="96" height="84" rx="10" fill="#fff" />
      <rect x="52" y="22" width="96" height="84" rx="10" fill="none" stroke="#2563eb" strokeWidth="5" />
      <rect x="66" y="36" width="68" height="18" rx="4" fill={`url(#${u}o)`} />
      <rect x="66" y="62" width="48" height="7" rx="3.5" fill="#d5dbd1" />
      <rect x="66" y="75" width="60" height="7" rx="3.5" fill="#d5dbd1" />
      <rect x="66" y="88" width="34" height="7" rx="3.5" fill="#d5dbd1" />
      <g transform="translate(96 62) scale(0.5)">
        <polygon points={STAR} fill="#2563eb" />
      </g>
      <path d="M58 30 L98 24 L58 60Z" fill="#fff" opacity="0.4" />
    </svg>
  );
}

/** A polo shirt with a collar and a chest logo. */
export function PoloArt() {
  const u = useUid();
  const body =
    'M42 6 L14 20 L2 50 L26 58 L32 46 V106 H88 V46 L94 58 L118 50 L106 20 L78 6 C74 18 66 22 60 22 C54 22 46 18 42 6Z';
  return (
    <svg viewBox="0 0 200 150" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}f`} x1="0" y1="0" x2="1" y2="1">
          <Stops from="#7cb8ff" to="#2b66e6" />
        </linearGradient>
        <linearGradient id={`${u}g`} x1="0" y1="0" x2="0.7" y2="0.7">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="138" rx="56" ry="5" fill="#0e1b14" opacity="0.14" />
      <g transform="translate(34 14) scale(1.1)">
        <path d={body} fill={`url(#${u}f)`} />
        <path d="M2 50 L14 20 L42 6 L44 30 L32 46 L26 58Z" fill="#1d4fc0" opacity="0.18" />
        <path d="M118 50 L106 20 L78 6 L76 30 L88 46 L94 58Z" fill="#1d4fc0" opacity="0.1" />
        <path d={body} fill={`url(#${u}g)`} />
        <path d="M40 4 L60 34 L80 4 L74 2 C70 14 66 18 60 18 C54 18 50 14 46 2Z" fill="#fff" />
        <rect x="58" y="24" width="4" height="26" rx="2" fill="#fff" />
        <circle cx="60" cy="32" r="2.2" fill="#2b66e6" />
        <circle cx="60" cy="42" r="2.2" fill="#2b66e6" />
        <circle cx="78" cy="56" r="7" fill="#2563eb" />
        <polygon points="78,51 79.6,55 84,55.2 80.6,57.8 81.8,62 78,59.6 74.2,62 75.4,57.8 72,55.2 76.4,55" fill="#fff" />
      </g>
    </svg>
  );
}

/** A sheet of die-cut stickers. */
export function StickersArt() {
  const u = useUid();
  return (
    <svg viewBox="0 0 200 150" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}h`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb06e" />
          <stop offset="0.35" stopColor="#ff6fa8" />
          <stop offset="0.7" stopColor="#8a6bff" />
          <stop offset="1" stopColor="#3fd0ff" />
        </linearGradient>
        <linearGradient id={`${u}b`} x1="0" y1="0" x2="1" y2="1">
          <Stops from="#7cb8ff" to="#2b66e6" />
        </linearGradient>
        <linearGradient id={`${u}g`} x1="0" y1="0" x2="1" y2="1">
          <Stops from="#7ee0a8" to="#2ea54a" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="138" rx="62" ry="5" fill="#0e1b14" opacity="0.12" />
      <g transform="rotate(-8 70 76)">
        <circle cx="70" cy="76" r="38" fill="#fff" />
        <circle cx="70" cy="76" r="33" fill={`url(#${u}h)`} />
        <g transform="translate(40 46) scale(0.6)">
          <polygon points={STAR} fill="#fff" />
        </g>
        <path d="M108 84 C96 86 84 98 82 112 L108 112 Z" fill="#fff" opacity="0.92" />
      </g>
      <g transform="rotate(12 132 66)">
        <rect x="104" y="38" width="56" height="56" rx="16" fill="#fff" />
        <rect x="109" y="43" width="46" height="46" rx="12" fill={`url(#${u}b)`} />
        <polygon points="136,50 124,68 132,68 128,84 142,64 134,64" fill="#fff" />
      </g>
      <g transform="rotate(-6 138 110)">
        <circle cx="138" cy="112" r="21" fill="#fff" />
        <circle cx="138" cy="112" r="17" fill={`url(#${u}g)`} />
        <path d="M129 112 L136 119 L148 105" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** A printed mug on a saucer. */
export function MugsArt() {
  const u = useUid();
  return (
    <svg viewBox="0 0 200 150" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}m`} x1="0" y1="0" x2="1" y2="0">
          <Stops from="#ffffff" to="#c9d6ef" />
        </linearGradient>
        <linearGradient id={`${u}o`} x1="0" y1="0" x2="1" y2="0">
          <Stops from="#ffa25c" to="#ff5a0a" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="128" rx="58" ry="9" fill="#0e1b14" opacity="0.14" />
      <ellipse cx="100" cy="124" rx="54" ry="8" fill="#fff" />
      <path d="M78 24 C70 32 86 36 78 46" fill="none" stroke="#0e1b14" strokeOpacity="0.25" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M98 18 C90 28 106 32 98 44" fill="none" stroke="#0e1b14" strokeOpacity="0.25" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M140 62 h8 a20 20 0 0 1 0 40 h-8" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" />
      <path d="M140 62 h8 a20 20 0 0 1 0 40 h-8" fill="none" stroke="#c9d6ef" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <rect x="56" y="52" width="88" height="72" rx="14" fill={`url(#${u}m)`} />
      <rect x="56" y="78" width="88" height="24" fill={`url(#${u}o)`} />
      <g transform="translate(84 68) scale(0.44)">
        <polygon points={STAR} fill="#fff" />
      </g>
      <rect x="64" y="58" width="9" height="60" rx="4.5" fill="#fff" opacity="0.6" />
      <ellipse cx="100" cy="52" rx="44" ry="8" fill="#dfe6f3" />
      <ellipse cx="100" cy="52" rx="38" ry="5.5" fill="#7a4b2a" />
    </svg>
  );
}

/** An event backdrop on two stands, with a repeat pattern of logo dots. */
export function BackdropArt() {
  const u = useUid();
  const dots = ['#1177bf', '#2ea54a', '#f38432', '#c42a5c'];
  return (
    <svg viewBox="0 0 200 150" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="136" rx="72" ry="7" fill="#0e1b14" opacity="0.14" />
      <path d="M30 128 V26 M170 128 V26" stroke="#3a403b" strokeWidth="6" strokeLinecap="round" />
      <rect x="18" y="126" width="24" height="7" rx="3.5" fill="#3a403b" />
      <rect x="158" y="126" width="24" height="7" rx="3.5" fill="#3a403b" />
      <rect x="26" y="30" width="148" height="86" rx="8" fill="#fff" />
      {Array.from({ length: 5 }, (_, row) =>
        Array.from({ length: 9 }, (_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={42 + col * 14.5 + (row % 2) * 7}
            cy={44 + row * 15}
            r="3.6"
            fill={dots[(row + col) % 4]}
          />
        )),
      )}
      <rect x="26" y="30" width="148" height="86" rx="8" fill={`url(#${u}s)`} />
      <rect x="26" y="30" width="148" height="86" rx="8" fill="none" stroke="#e1e6dd" strokeWidth="1.5" />
    </svg>
  );
}

/** A car with a wrapped body. */
export function CarArt() {
  const u = useUid();
  return (
    <svg viewBox="0 0 200 150" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}b`} x1="0" y1="0" x2="0" y2="1">
          <Stops from="#ffffff" to="#d9dfd5" />
        </linearGradient>
        <linearGradient id={`${u}w`} x1="0" y1="0" x2="1" y2="0">
          <Stops from="#ffa25c" to="#ff5a0a" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="128" rx="78" ry="6" fill="#0e1b14" opacity="0.16" />
      <path
        d="M22 106 V88 Q22 78 32 76 L58 72 L76 46 Q80 40 88 40 H126 Q134 40 140 48 L156 72 L172 76 Q180 78 180 90 V106 Q180 112 174 112 H28 Q22 112 22 106Z"
        fill={`url(#${u}b)`}
      />
      <path d="M22 96 H180 V106 Q180 112 174 112 H28 Q22 112 22 106Z" fill={`url(#${u}w)`} />
      <path d="M22 96 Q80 86 132 94 T180 88 V96 H22Z" fill={`url(#${u}w)`} />
      <path d="M84 50 Q86 46 90 46 H100 V72 H70Z" fill="#8fd0ff" opacity="0.9" />
      <path d="M106 46 H124 Q130 46 134 52 L148 72 H106Z" fill="#8fd0ff" opacity="0.9" />
      <path d="M84 50 L100 46 L86 72 H72Z" fill="#fff" opacity="0.45" />
      <circle cx="112" cy="84" r="2.5" fill="#1177bf" />
      <circle cx="120" cy="84" r="2.5" fill="#2ea54a" />
      <circle cx="128" cy="84" r="2.5" fill="#f38432" />
      <circle cx="136" cy="84" r="2.5" fill="#c42a5c" />
      <g>
        <circle cx="58" cy="112" r="16" fill="#1f231f" />
        <circle cx="58" cy="112" r="7" fill="#cfd6cb" />
        <circle cx="146" cy="112" r="16" fill="#1f231f" />
        <circle cx="146" cy="112" r="7" fill="#cfd6cb" />
      </g>
    </svg>
  );
}

/** A framed print on a wall. */
export function FrameArt() {
  const u = useUid();
  return (
    <svg viewBox="0 0 200 150" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}s`} x1="0" y1="0" x2="0" y2="1">
          <Stops from="#9bd0ff" to="#ffe1b0" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="138" rx="50" ry="5" fill="#0e1b14" opacity="0.12" />
      <rect x="48" y="14" width="104" height="116" rx="8" fill="#252a26" />
      <rect x="58" y="24" width="84" height="96" rx="3" fill="#fff" />
      <rect x="66" y="32" width="68" height="80" rx="2" fill={`url(#${u}s)`} />
      <circle cx="114" cy="54" r="9" fill="#ff8a3d" />
      <path d="M66 112 L88 78 L102 98 L116 84 L134 112Z" fill="#2ea54a" />
      <path d="M66 112 L84 92 L96 112Z" fill="#1f8a3c" />
      <rect x="62" y="28" width="6" height="88" fill="#fff" opacity="0.25" />
    </svg>
  );
}

/* ------------------------------------------------------------------- steps */

/** Step 1: a banner with its size marked on both sides. */
export function SizeStepArt() {
  const u = useUid();
  return (
    <svg viewBox="0 0 200 150" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}o`} x1="0" y1="0" x2="1" y2="1">
          <Stops from="#ffa25c" to="#ff5a0a" />
        </linearGradient>
      </defs>
      <rect x="50" y="26" width="120" height="66" rx="8" fill={`url(#${u}o)`} />
      <g transform="translate(88 32) scale(0.6)">
        <polygon points={STAR} fill="#fff" />
      </g>
      <rect x="62" y="74" width="50" height="6" rx="3" fill="#fff" opacity="0.7" />
      <path d="M50 112 H170" stroke="#33413a" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M50 106 V118 M170 106 V118" stroke="#33413a" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="86" y="103" width="48" height="20" rx="10" fill="#0e1b14" />
      <text x="110" y="117" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="800" fill="#fff">
        8 ft
      </text>
      <path d="M32 26 V92" stroke="#33413a" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M26 26 H38 M26 92 H38" stroke="#33413a" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="10" y="49" width="44" height="20" rx="10" fill="#0e1b14" />
      <text x="32" y="63" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="800" fill="#fff">
        4 ft
      </text>
    </svg>
  );
}

/** Step 2: a picture file with an upload button. */
export function ArtworkStepArt() {
  const u = useUid();
  return (
    <svg viewBox="0 0 200 150" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}o`} x1="0" y1="0" x2="1" y2="1">
          <Stops from="#ffa25c" to="#ff5a0a" />
        </linearGradient>
        <linearGradient id={`${u}i`} x1="0" y1="0" x2="0" y2="1">
          <Stops from="#9bd0ff" to="#5aa2ff" />
        </linearGradient>
      </defs>
      <rect x="54" y="18" width="88" height="110" rx="12" fill="#fff" />
      <rect x="64" y="28" width="68" height="50" rx="7" fill={`url(#${u}i)`} />
      <circle cx="116" cy="42" r="7" fill="#ffd66b" />
      <path d="M64 78 L86 52 L102 68 L112 58 L132 78Z" fill="#2ea54a" />
      <rect x="64" y="88" width="50" height="7" rx="3.5" fill="#d5dbd1" />
      <rect x="64" y="101" width="34" height="7" rx="3.5" fill="#d5dbd1" />
      <circle cx="140" cy="112" r="24" fill={`url(#${u}o)`} />
      <path d="M140 124 V101 M130 110 L140 100 L150 110" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 60 H44 M24 76 H40 M32 92 H44" stroke="#0e1b14" strokeOpacity="0.25" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

/** Step 3: a phone confirming a Mobile Money payment. */
export function PayStepArt() {
  const u = useUid();
  return (
    <svg viewBox="0 0 200 150" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}g`} x1="0" y1="0" x2="1" y2="1">
          <Stops from="#7ee0a8" to="#2ea54a" />
        </linearGradient>
        <linearGradient id={`${u}c`} x1="0" y1="0" x2="1" y2="1">
          <Stops from="#ffd66b" to="#ff9a1a" />
        </linearGradient>
      </defs>
      <rect x="70" y="10" width="64" height="126" rx="16" fill="#252a26" />
      <rect x="75" y="16" width="54" height="114" rx="12" fill="#fff" />
      <rect x="92" y="20" width="20" height="5" rx="2.5" fill="#252a26" />
      <circle cx="102" cy="58" r="20" fill={`url(#${u}g)`} />
      <path d="M93 58 L100 65 L112 51" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="102" y="98" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="800" fill="#0e1b14">
        Paid
      </text>
      <rect x="84" y="108" width="36" height="6" rx="3" fill="#d5dbd1" />
      <g>
        <ellipse cx="42" cy="118" rx="22" ry="8" fill="#e07a10" />
        <rect x="20" y="106" width="44" height="12" fill="#ff9a1a" />
        <ellipse cx="42" cy="106" rx="22" ry="8" fill={`url(#${u}c)`} />
        <ellipse cx="42" cy="96" rx="22" ry="8" fill="#e07a10" />
        <rect x="20" y="86" width="44" height="10" fill="#ff9a1a" />
        <ellipse cx="42" cy="86" rx="22" ry="8" fill={`url(#${u}c)`} />
        <text x="42" y="90" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="12" fontWeight="800" fill="#fff">
          ₵
        </text>
      </g>
      <path d="M150 40 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3z M164 84 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2z" fill="#2563eb" opacity="0.9" />
    </svg>
  );
}

/** The phone screen for "How ordering works": a job on screen, the same
 * three steps as a ticked checklist, and a paid badge — the order the visitor
 * is about to take, shown once instead of illustrated three separate times.
 * Single tone (currentColor) with one accent blue for what's already done,
 * so it reads as a phone screenshot rather than a decorative character. */
export function OrderingArt() {
  return (
    <svg viewBox="0 0 240 300" fill="none" aria-hidden="true">
      {/* phone frame */}
      <rect x="4" y="4" width="232" height="292" rx="28" stroke="currentColor" strokeWidth="4" opacity="0.5" />
      <rect x="94" y="18" width="52" height="7" rx="3.5" fill="currentColor" opacity="0.5" />

      {/* the job, at the top of the screen */}
      <rect x="24" y="42" width="192" height="64" rx="10" fill="currentColor" opacity="0.12" />
      <rect x="40" y="58" width="70" height="9" rx="4.5" fill="currentColor" />
      <rect x="40" y="75" width="100" height="7" rx="3.5" fill="currentColor" opacity="0.5" />
      <rect x="40" y="88" width="56" height="7" rx="3.5" fill="currentColor" opacity="0.5" />

      {/* three steps, ticked off one at a time */}
      <g>
        <circle cx="40" cy="140" r="14" fill="#2563eb" />
        <path d="M34 140 l4 4 l8 -8" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x="64" y="134" width="130" height="7" rx="3.5" fill="currentColor" opacity="0.7" />
        <rect x="64" y="147" width="90" height="6" rx="3" fill="currentColor" opacity="0.35" />
      </g>
      <g>
        <circle cx="40" cy="186" r="14" fill="#2563eb" />
        <path d="M34 186 l4 4 l8 -8" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x="64" y="180" width="150" height="7" rx="3.5" fill="currentColor" opacity="0.7" />
        <rect x="64" y="193" width="100" height="6" rx="3" fill="currentColor" opacity="0.35" />
      </g>
      <g>
        <circle cx="40" cy="232" r="14" stroke="currentColor" strokeWidth="3" opacity="0.5" />
        <rect x="64" y="226" width="120" height="7" rx="3.5" fill="currentColor" opacity="0.5" />
        <rect x="64" y="239" width="80" height="6" rx="3" fill="currentColor" opacity="0.3" />
      </g>

      {/* the paid pill, waiting at the bottom */}
      <rect x="64" y="264" width="112" height="26" rx="13" fill="currentColor" opacity="0.12" />
      <text x="120" y="281" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="700" fill="currentColor" opacity="0.6">
        Pay when ready
      </text>
    </svg>
  );
}

/* --------------------------------------------------------------------- map */

/** A stylised street map with a pin on the workshop. */
export function MapArt() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="400" height="300" fill="#eef1ea" />
      <g fill="#d3e5d8">
        <rect x="12" y="14" width="96" height="70" rx="10" />
        <rect x="132" y="14" width="88" height="70" rx="10" />
        <rect x="248" y="14" width="140" height="70" rx="10" />
        <rect x="12" y="108" width="96" height="70" rx="10" />
        <rect x="248" y="108" width="140" height="70" rx="10" />
        <rect x="12" y="204" width="208" height="82" rx="10" />
        <rect x="248" y="204" width="140" height="82" rx="10" />
      </g>
      <g fill="#c6dcbe">
        <rect x="140" y="118" width="80" height="50" rx="25" />
        <rect x="26" y="222" width="60" height="46" rx="10" />
      </g>
      <g stroke="#fff" strokeLinecap="round" fill="none">
        <path d="M0 96 H400" strokeWidth="20" />
        <path d="M120 0 V300" strokeWidth="16" />
        <path d="M236 0 V300" strokeWidth="16" />
        <path d="M0 190 H400" strokeWidth="14" />
      </g>
      <path d="M0 96 H400" stroke="#ffb77e" strokeWidth="3" strokeDasharray="10 10" fill="none" />
      <g className="map-pulse">
        <circle cx="236" cy="96" r="30" fill="#2563eb" opacity="0.18" />
        <circle cx="236" cy="96" r="18" fill="#2563eb" opacity="0.25" />
      </g>
      <g className="map-pin">
        <path d="M236 44 C218 44 206 58 206 74 C206 96 236 124 236 124 C236 124 266 96 266 74 C266 58 254 44 236 44Z" fill="#2563eb" />
        <circle cx="236" cy="74" r="12" fill="#fff" />
      </g>
    </svg>
  );
}
