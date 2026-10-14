/**
 * The four dots in the Vikipat logo double as an order's progress: they light
 * up one at a time as the order moves through the workshop. The API speaks in
 * public status text (see PUBLIC_STATUS in the API's order service); this maps
 * that text onto the dots.
 */
export type Stage = 'paid' | 'artwork' | 'printing' | 'ready';

export const STAGES: { key: Stage; label: string; color: string }[] = [
  { key: 'paid', label: 'Paid', color: 'var(--dot-1)' },
  { key: 'artwork', label: 'Artwork', color: 'var(--dot-2)' },
  { key: 'printing', label: 'Printing', color: 'var(--dot-3)' },
  { key: 'ready', label: 'Ready', color: 'var(--dot-4)' },
];

export type Progress = {
  /** Dots fully done, 0 to 4. */
  lit: number;
  /** The dot being worked on now, or null when nothing is in progress. */
  current: number | null;
  halted: 'on_hold' | 'cancelled' | null;
};

const byStatus: Record<string, [number, number | null]> = {
  'Under review': [0, 0],
  'Awaiting payment': [0, 0],
  'Payment received': [1, 1],
  'Artwork review': [1, 1],
  'Awaiting your approval': [1, 1],
  'Ready for production': [2, 2],
  'In production': [2, 2],
  'Quality check': [2, 2],
  'Ready for pickup': [3, 3],
  'Out for delivery': [3, 3],
  Completed: [4, null],
};

export function progressFor(publicStatus: string): Progress {
  if (publicStatus === 'On hold') return { lit: 0, current: null, halted: 'on_hold' };
  if (publicStatus === 'Cancelled') return { lit: 0, current: null, halted: 'cancelled' };
  const [lit, current] = byStatus[publicStatus] ?? [0, null];
  return { lit, current, halted: null };
}
