import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

type ToastAction = { label: string; to: string } | { label: string; onClick: () => void };

type ToastData = { id: number; message: string; action?: ToastAction };

type ToastValue = {
  toast: ToastData | null;
  show: (message: string, action?: ToastAction) => void;
  dismiss: () => void;
};

const ToastContext = createContext<ToastValue | null>(null);

/**
 * One short confirmation at a time ("Added to cart", "Removed"), shown above
 * the tab bar. It never takes focus; screen readers hear it through the live
 * region in ToastOutlet.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback((message: string, action?: ToastAction) => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), message, action });
    timer.current = window.setTimeout(() => setToast(null), action ? 6000 : 4000);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const value = useMemo(() => ({ toast, show, dismiss }), [toast, show, dismiss]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used within ToastProvider');
  return value;
}

/** Rendered by AppShell so the toast sits above whichever bottom bar the page has. */
export function ToastOutlet() {
  const { toast, dismiss } = useToast();

  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div className="toast" key={toast.id}>
          <CheckCircle2 aria-hidden="true" />
          <span className="toast-text">{toast.message}</span>
          {toast.action &&
            ('to' in toast.action ? (
              <Link className="toast-action" to={toast.action.to} onClick={dismiss}>
                {toast.action.label}
              </Link>
            ) : (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  (toast.action as { onClick: () => void }).onClick();
                  dismiss();
                }}
              >
                {toast.action.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
