import { RefObject, useEffect, useRef } from 'react';

/**
 * Shared behaviour for sheets and dialogs: lock the page behind them, move
 * focus in, keep Tab inside, close on Escape and on the phone's back button,
 * and hand focus back to whatever opened them.
 *
 * Runs once per open. `onClose` is read through a ref so an inline arrow from
 * the caller does not re-run the effect (and steal focus) on every render.
 *
 * `afterClose` runs once the sheet's history entry is gone. Anything that
 * changes the URL because of the sheet (applying filters) belongs there, or
 * the Back button would bring the old URL back.
 */
export function useOverlay(
  onClose: () => void,
  options: { initialFocus?: RefObject<HTMLElement | null>; afterClose?: () => void } = {},
) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const afterCloseRef = useRef(options.afterClose);
  afterCloseRef.current = options.afterClose;
  const initialFocus = options.initialFocus;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (initialFocus?.current ?? closeRef.current)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // An extra history entry lets the Android back button close the sheet
    // instead of leaving the page. It is pushed on the next tick so React's
    // development double-mount does not leave a stray entry behind.
    let pushed = false;
    let opened = false;
    let afterDone = false;
    const runAfter = () => {
      if (afterDone) return;
      afterDone = true;
      afterCloseRef.current?.();
    };
    const onPop = () => {
      pushed = false;
      onCloseRef.current();
      runAfter();
    };
    const pushTimer = window.setTimeout(() => {
      window.history.pushState({ ...window.history.state, overlay: true }, '');
      pushed = true;
      opened = true;
      window.addEventListener('popstate', onPop);
    }, 0);

    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(pushTimer);
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      // Closed by the UI rather than by Back: drop our history entry, unless a
      // link inside the sheet already navigated past it. The router hears the
      // same popstate first, then afterClose runs on the settled URL.
      if (pushed && window.history.state?.overlay) {
        window.addEventListener('popstate', () => window.setTimeout(runAfter, 0), { once: true });
        window.history.back();
      } else if (opened) {
        // `opened` is false only for React's development double-mount, which
        // tears the sheet down before it was ever really shown.
        runAfter();
      }
      opener?.focus?.({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { panelRef, closeRef };
}
