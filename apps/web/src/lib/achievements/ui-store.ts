import { create } from 'zustand';

interface AchievementsUiState {
  /**
   * Pedido de abrir as Conquistas (o “Ver” do aviso): `id` abre o detail daquela medalha; `null`,
   * só a seção. O `AchievementsNavigator` (no AppShell) atende e limpa.
   */
  request: { id: string | null } | null;
  show(id: string | null): void;
  clear(): void;
}

export const useAchievementsUi = create<AchievementsUiState>()((set) => ({
  request: null,
  show: (id) => set({ request: { id } }),
  clear: () => set({ request: null }),
}));
