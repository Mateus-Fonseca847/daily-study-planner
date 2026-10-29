import { useEffect } from 'react';
import { useToasts, type Toast } from '../../lib/toast-store';
import { Button } from './Button';

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToasts((s) => s.dismiss);
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), toast.durationMs);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.durationMs, dismiss]);

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border-hair bg-raised px-4 py-3 text-md shadow-popover">
      <span>{toast.message}</span>
      {toast.actionLabel && (
        <Button
          variant="outline"
          className="h-control-sm px-3"
          onClick={() => {
            toast.onAction?.();
            dismiss(toast.id);
          }}
        >
          {toast.actionLabel}
        </Button>
      )}
    </div>
  );
}

/** Região viva: leitores de tela anunciam cada toast (role="status"). */
export function ToastRegion() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex w-full max-w-toast -translate-x-1/2 flex-col gap-2 px-4"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}
