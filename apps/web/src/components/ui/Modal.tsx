import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useFocusScope } from '../../lib/use-focus-scope';
import { Button } from './Button';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Botões de ação (alinhados à direita). */
  footer?: ReactNode;
}

/** Diálogo modal acessível: foco preso, Esc fecha, foco volta a quem abriu. */
export function Modal({ title, onClose, children, footer }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusScope(ref, { onEscape: onClose });

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-scrim p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-modal w-full max-w-modal flex-col rounded-xl border-hair bg-raised shadow-popover"
      >
        <header className="flex items-center justify-between gap-4 px-6 pt-6 pb-4">
          <h2 id={titleId} className="text-title font-semibold tracking-tight">
            {title}
          </h2>
          <Button variant="tile" size="xs" aria-label="Fechar" onClick={onClose}>
            <X aria-hidden strokeWidth={1.5} className="size-icon-sm" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2">{children}</div>
        {footer && <footer className="flex justify-end gap-2 px-6 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
