import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface FocusScopeOptions {
  onEscape: () => void;
  /** Elemento que recebe o foco ao fechar (padrão: quem tinha o foco ao abrir). */
  restoreTo?: HTMLElement | null;
}

/**
 * Prende o foco dentro de `ref`, fecha com Esc e devolve o foco ao fechar.
 * O primeiro campo com `data-autofocus` (ou o primeiro focável) recebe o foco inicial.
 */
export function useFocusScope(
  ref: RefObject<HTMLElement | null>,
  { onEscape, restoreTo }: FocusScopeOptions,
): void {
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    const panel = ref.current;
    const previous = restoreTo ?? (document.activeElement as HTMLElement | null);
    const initial =
      panel?.querySelector<HTMLElement>('[data-autofocus]') ??
      panel?.querySelector<HTMLElement>(FOCUSABLE);
    initial?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onEscapeRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
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
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previous?.isConnected) previous.focus();
    };
  }, [ref, restoreTo]);
}
