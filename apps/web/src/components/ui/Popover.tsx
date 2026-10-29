import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PopoverProps {
  /** Elemento âncora (ex.: o chip clicado). */
  anchor: HTMLElement;
  onClose: () => void;
  'aria-label': string;
  children: ReactNode;
}

/** Distância mínima entre o popover e as bordas da janela / a âncora (px). */
const GAP = 8;

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface Position {
  top: number;
  left: number;
}

/** Prefere abrir à direita da âncora; se não couber, à esquerda; sempre dentro da janela. */
function computePosition(anchor: DOMRect, panel: DOMRect): Position {
  const { innerWidth, innerHeight } = window;
  let left = anchor.right + GAP;
  if (left + panel.width > innerWidth - GAP) left = anchor.left - GAP - panel.width;
  left = Math.max(GAP, Math.min(left, innerWidth - GAP - panel.width));
  const top = Math.max(GAP, Math.min(anchor.top, innerHeight - GAP - panel.height));
  return { top, left };
}

export function Popover({ anchor, onClose, children, ...rest }: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);
  // Ref evita reabrir/refocar o popover quando o pai recria `onClose` a cada render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const place = () =>
      setPosition(computePosition(anchor.getBoundingClientRect(), panel.getBoundingClientRect()));
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [anchor, children]);

  useEffect(() => {
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      // Prende o foco dentro do popover enquanto ele estiver aberto.
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panel?.contains(target) || anchor.contains(target)) return;
      onCloseRef.current();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      if (anchor.isConnected) anchor.focus();
    };
  }, [anchor]);

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={rest['aria-label']}
      style={{ top: position?.top ?? 0, left: position?.left ?? 0 }}
      className={`fixed z-50 w-popover rounded-xl border-hair bg-raised p-4 shadow-popover ${
        position ? '' : 'opacity-0'
      }`}
    >
      {children}
    </div>,
    document.body,
  );
}
