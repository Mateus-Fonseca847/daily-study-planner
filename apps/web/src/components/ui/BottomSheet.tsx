import { useId, useRef, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { shouldCloseSheet } from '../../lib/responsive/gesture';
import { useBackToClose } from '../../lib/responsive/use-back-close';
import { useFocusScope } from '../../lib/use-focus-scope';

interface BottomSheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Barra de ações fixa no rodapé do sheet. */
  footer?: ReactNode;
  /** Esconde o título visualmente (ele continua como nome do diálogo). */
  hideTitle?: boolean;
}

/**
 * Sheet que sobe da borda inferior (celular): foco preso, `role="dialog"`, Esc, botão voltar do
 * aparelho e arrasto da alça para baixo fecham; rola por dentro; respeita a área segura e o
 * teclado virtual (`vv-box` acompanha a área visível).
 */
export function BottomSheet({ title, onClose, children, footer, hideTitle }: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const requestClose = useBackToClose(true, onClose);
  useFocusScope(panelRef, { onEscape: requestClose });

  const drag = useRef<{ startY: number; startAt: number; dy: number } | null>(null);
  const setOffset = (dy: number) => {
    const panel = panelRef.current;
    if (panel) panel.style.transform = dy > 0 ? `translateY(${dy}px)` : '';
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, startAt: e.timeStamp, dy: 0 };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    d.dy = e.clientY - d.startY;
    setOffset(d.dy);
  };
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const close = shouldCloseSheet({ dy: d.dy, dtMs: e.timeStamp - d.startAt });
    setOffset(0);
    if (close) requestClose();
  };

  return createPortal(
    <div className="vv-box fixed z-50">
      <div aria-hidden className="absolute inset-0 bg-scrim" onClick={requestClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 flex max-h-sheet-max animate-sheet-in flex-col rounded-t-sheet border-t-hair bg-raised pb-safe-bottom pl-safe-left pr-safe-right shadow-popover"
      >
        <div
          data-sheet-handle
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          className="grid h-touch shrink-0 cursor-grab touch-none place-items-center select-none"
        >
          <span aria-hidden className="h-handle-h w-handle-w rounded-full bg-line-strong" />
        </div>
        <h2
          id={titleId}
          className={
            hideTitle
              ? 'sr-only'
              : 'px-sheet-x pb-3 text-title font-semibold tracking-tight text-fg'
          }
        >
          {title}
        </h2>
        <div className="scroll-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-sheet-x pt-panel-top pb-4">
          {children}
        </div>
        {footer && <footer className="flex flex-col gap-2 px-sheet-x pb-4">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
