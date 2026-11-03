import { useEffect, useRef, type RefObject } from 'react';
import { swipeDirection, type SwipeDirection } from './gesture';

interface SwipeOptions {
  enabled: boolean;
  /** `left` = dedo para a esquerda (avançar); `right` = para a direita (voltar). */
  onSwipe: (direction: Exclude<SwipeDirection, null>) => void;
}

/**
 * Deslizar na horizontal muda o período (Dia e Mês no celular). Usa eventos de ponteiro, sem
 * biblioteca: o elemento deve ter `touch-action: pan-y` (o navegador cuida da rolagem vertical e
 * deixa o gesto horizontal conosco), então não há conflito com rolar a página.
 * Só reage a toque/caneta, nunca ao mouse.
 */
export function useSwipe(ref: RefObject<HTMLElement | null>, { enabled, onSwipe }: SwipeOptions) {
  const onSwipeRef = useRef(onSwipe);
  useEffect(() => {
    onSwipeRef.current = onSwipe;
  }, [onSwipe]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let start: { x: number; y: number; t: number; id: number } | null = null;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || !e.isPrimary) return;
      // Controles (botões, campos) e áreas que rolam na horizontal ficam de fora.
      if ((e.target as Element).closest('[data-no-swipe], input, select, textarea')) return;
      start = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId };
    };
    const onUp = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      const direction = swipeDirection({
        dx: e.clientX - start.x,
        dy: e.clientY - start.y,
        dtMs: e.timeStamp - start.t,
      });
      start = null;
      if (direction) onSwipeRef.current(direction);
    };
    const cancel = () => {
      start = null;
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', cancel);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', cancel);
    };
  }, [ref, enabled]);
}
