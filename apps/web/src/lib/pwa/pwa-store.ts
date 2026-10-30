import { create } from 'zustand';

/** Evento (não padronizado) que o Chrome e o Edge disparam quando o app pode ser instalado. */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaState {
  /** Há uma versão nova do service worker esperando a confirmação do usuário. */
  needRefresh: boolean;
  /** Aplica a versão nova (ativa o service worker novo e recarrega). */
  applyUpdate: (() => Promise<void>) | null;
  installEvent: BeforeInstallPromptEvent | null;
  setUpdate(applyUpdate: () => Promise<void>): void;
  setInstallEvent(event: BeforeInstallPromptEvent | null): void;
}

export const usePwa = create<PwaState>()((set) => ({
  needRefresh: false,
  applyUpdate: null,
  installEvent: null,
  setUpdate: (applyUpdate) => set({ needRefresh: true, applyUpdate }),
  setInstallEvent: (installEvent) => set({ installEvent }),
}));

/** O app está rodando como instalado (janela própria)? */
export function isStandalone(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone;
}
