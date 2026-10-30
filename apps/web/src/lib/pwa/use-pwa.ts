import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useData } from '../data/app-store';
import { browserStorage } from '../browser-storage';
import { useToasts } from '../toast-store';
import { requestPersistentStorage } from './storage';
import { usePwa } from './pwa-store';
import { canOfferUpdate } from './update-policy';

const PERSIST_ASKED_KEY = 'daily:persist-asked';
/** Tempo do toast de atualização: longo, mas a oferta também fica em Preferências. */
const UPDATE_TOAST_MS = 20_000;

const subscribeOnline = (notify: () => void) => {
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);
  return () => {
    window.removeEventListener('online', notify);
    window.removeEventListener('offline', notify);
  };
};

/** `navigator.onLine` reativo. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

/** Oferece “Nova versão disponível” uma vez, e nunca durante uma sessão de foco. */
export function useUpdateOffer(): void {
  const needRefresh = usePwa((s) => s.needRefresh);
  const focus = useData((s) => s.focusActive);
  const offered = useRef(false);

  useEffect(() => {
    if (!needRefresh || offered.current || !canOfferUpdate(focus)) return;
    offered.current = true;
    useToasts.getState().push({
      message: 'Nova versão disponível',
      actionLabel: 'Atualizar',
      onAction: () => void usePwa.getState().applyUpdate?.(),
      durationMs: UPDATE_TOAST_MS,
    });
  }, [needRefresh, focus]);
}

/** Pede armazenamento persistente na primeira vez em que existem dados criados pelo usuário. */
export function usePersistOnFirstData(): void {
  const hasData = useData(
    (s) => s.subjects.length + s.events.length + s.habits.length + s.waterLogs.length > 0,
  );

  useEffect(() => {
    if (!hasData) return;
    const storage = browserStorage();
    if (storage.getItem(PERSIST_ASKED_KEY)) return;
    storage.setItem(PERSIST_ASKED_KEY, '1');
    void requestPersistentStorage();
  }, [hasData]);
}
