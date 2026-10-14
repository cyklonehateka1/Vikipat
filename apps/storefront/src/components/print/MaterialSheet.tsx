import { useState } from 'react';
import { Sheet } from '../Sheet';
import { PrintMaterial } from '../../types/pricing';

/** Pick a material. Starts with the ones that suit the job, with all on request. */
export function MaterialSheet({
  materials,
  suggested,
  selectedCode,
  onPick,
  onClose,
  afterClose,
}: {
  materials: PrintMaterial[];
  /** Materials recommended for the chosen job; empty shows everything. */
  suggested: PrintMaterial[];
  selectedCode?: string;
  onPick: (code: string) => void;
  onClose: () => void;
  afterClose?: () => void;
}) {
  const [showAll, setShowAll] = useState(!suggested.length);
  const list = showAll ? materials : suggested;

  return (
    <Sheet title="Choose a material" onClose={onClose} afterClose={afterClose}>
      <div className="choice-grid" role="radiogroup" aria-label="Material">
        {list.map((material) => (
          <label className="choice" key={material.code}>
            <input
              type="radio"
              name="material"
              checked={material.code === selectedCode}
              onChange={() => onPick(material.code)}
            />
            <span className="choice-body">
              <span className="print-material-row">
                <span className="choice-title">{material.name}</span>
                {material.badge && <span className="print-badge">{material.badge}</span>}
              </span>
              <span className="choice-note">{material.description}</span>
            </span>
          </label>
        ))}
      </div>
      {!showAll && suggested.length < materials.length && (
        <button type="button" className="btn btn-ghost btn-block print-show-all" onClick={() => setShowAll(true)}>
          Show all {materials.length} materials
        </button>
      )}
    </Sheet>
  );
}
