import { useSyncExternalStore } from 'react';
import { layoutFor, MEDIA, type Layout } from './breakpoints';
import { mediaStore } from './media';

/** `true` enquanto a consulta de mídia casa (reativo). */
export function useMediaQuery(query: string): boolean {
  const store = mediaStore(query);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => false);
}

/** Ponteiro grosseiro (dedo): `(pointer: coarse)`. */
export const usePointerCoarse = (): boolean => useMediaQuery(MEDIA.coarse);

/** Sem hover (`(hover: none)`): nada pode depender dele. */
export const useNoHover = (): boolean => useMediaQuery(MEDIA.noHover);

/** O usuário pediu menos movimento. */
export const useReducedMotion = (): boolean => useMediaQuery(MEDIA.reducedMotion);

/** Celular: faixa estreita ou paisagem baixa com toque. */
export const usePhone = (): boolean => useMediaQuery(MEDIA.phone);

const subscribeSize = (notify: () => void) => {
  window.addEventListener('resize', notify);
  window.addEventListener('orientationchange', notify);
  return () => {
    window.removeEventListener('resize', notify);
    window.removeEventListener('orientationchange', notify);
  };
};

/** Faixa de layout atual (celular, tablet, notebook ou desktop); recalculada ao redimensionar e girar. */
export function useBreakpoint(): Layout {
  const coarse = usePointerCoarse();
  return useSyncExternalStore(
    subscribeSize,
    () => layoutFor(window.innerWidth, window.innerHeight, coarse),
    () => 'desktop',
  );
}
