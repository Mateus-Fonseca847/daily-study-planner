import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Escopos abertos, do mais antigo ao mais novo: só o do topo trata Esc e Tab. */
const openScopes: symbol[] = [];

interface FocusScopeOptions {
  onEscape: () => void;
  /** Elemento que recebe o foco ao fechar (padrão: quem tinha o foco ao abrir). */
  restoreTo?: HTMLElement | null;
}

/**
 * Prende o foco dentro de `ref`, fecha com Esc e devolve o foco ao fechar.
 * O primeiro campo com `data-autofocus` (ou o primeiro focável) recebe o foco inicial. Com
 * diálogos empilhados (ex.: escolher o escopo por cima do painel), só o do topo reage.
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

    const scope = Symbol('focus-scope');
    openScopes.push(scope);
    const onKeyDown = (e: KeyboardEvent) => {
      if (openScopes.at(-1) !== scope) return;
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
      openScopes.splice(openScopes.indexOf(scope), 1);
      if (previous?.isConnected) previous.focus();
    };
  }, [ref, restoreTo]);
}
