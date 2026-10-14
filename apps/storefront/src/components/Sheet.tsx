import React, { useId } from 'react';
import { createPortal } from 'react-dom';
import { LazyMotion, domMax, m, useDragControls } from 'motion/react';
import { X } from 'lucide-react';
import { useOverlay } from '../lib/useOverlay';

const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;

/**
 * A bottom sheet on phones and a centred dialog from 640 px up. Closes on the
 * close button, the backdrop, Escape and the phone's back button. On phones the
 * grabber drags the sheet with your finger, and a flick down closes it: the
 * release velocity decides, not just the distance. Every exit runs the same
 * onClose, so a swipe cannot skip what the close button does.
 */
export function Sheet({
  title,
  onClose,
  children,
  footer,
  afterClose,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Runs once the sheet is closed and its history entry is gone. */
  afterClose?: () => void;
}) {
  const { panelRef, closeRef } = useOverlay(onClose, { afterClose });
  const titleId = useId();
  const controls = useDragControls();
  const draggable = isPhone();

  return createPortal(
    <LazyMotion features={domMax} strict>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <m.div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
        drag={draggable ? 'y' : false}
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.04, bottom: 0.7 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120 || info.velocity.y > 700) onClose();
        }}
      >
        <div className="sheet-grab" onPointerDown={(event) => draggable && controls.start(event)} aria-hidden="true" />
        <div className="sheet-head">
          <h2 className="sheet-title" id={titleId}>
            {title}
          </h2>
          <button ref={closeRef} type="button" className="icon-btn is-framed" onClick={onClose} aria-label="Close">
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </m.div>
    </LazyMotion>,
    document.body,
  );
}
