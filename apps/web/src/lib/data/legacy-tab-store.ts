import { create } from 'zustand';

interface LegacyTabState {
  /** Uma aba com a versão antiga do Daily gravou no formato v3 depois da atualização. */
  detected: boolean;
  detect(): void;
  dismiss(): void;
}

/** Aviso de aba antiga aberta (não mesclamos o que ela grava: o app novo lê só o v4). */
export const useLegacyTab = create<LegacyTabState>()((set) => ({
  detected: false,
  detect: () => set({ detected: true }),
  dismiss: () => set({ detected: false }),
}));
