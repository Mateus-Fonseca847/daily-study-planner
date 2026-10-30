import { registerSW } from 'virtual:pwa-register';
import { requestPersistentStorage } from './storage';
import { usePwa, type BeforeInstallPromptEvent } from './pwa-store';

/**
 * Liga o PWA: service worker (só no build; `pnpm dev` não registra) e o convite de instalação.
 * A atualização nunca é aplicada sozinha: o service worker novo espera `applyUpdate`.
 */
export function setupPwa(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // guardamos o evento para o botão “Instalar app”
    usePwa.getState().setInstallEvent(event as BeforeInstallPromptEvent);
  });
  window.addEventListener('appinstalled', () => {
    usePwa.getState().setInstallEvent(null);
    void requestPersistentStorage();
  });

  if (!import.meta.env.PROD) return;
  const update = registerSW({
    onNeedRefresh: () => usePwa.getState().setUpdate(() => update(true)),
  });
}
