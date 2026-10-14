import { Car, Frame, ImageIcon, Package, Presentation } from 'lucide-react';
import { PhotoKey, photos } from '../content/photos';

const missingIcon: Partial<Record<PhotoKey, typeof ImageIcon>> = {
  events: Presentation,
  vehicle: Car,
  indoor: Frame,
  packaging: Package,
};

/**
 * One photo slot. Slots whose photo has not been supplied yet render a quiet
 * placeholder; development builds also say which photo is still needed.
 */
export function Photo({
  name,
  className = '',
  eager = false,
}: {
  name: PhotoKey;
  className?: string;
  eager?: boolean;
}) {
  const entry = photos[name];

  if (entry.src) {
    return (
      <img
        className={`photo ${className}`.trim()}
        src={entry.src}
        alt={entry.alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
    );
  }

  const Icon = missingIcon[name] ?? ImageIcon;
  return (
    <span className={`photo-missing ${className}`.trim()} aria-hidden="true">
      <Icon strokeWidth={1.6} />
      {import.meta.env.DEV && <span className="photo-missing-note">Photo needed: {entry.needed}</span>}
    </span>
  );
}
