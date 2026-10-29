import { create } from 'zustand';
import type { FocusSession } from '@daily/shared';

interface FocusUiState {
  /** Última sessão encerrada (para a tela de resumo); só em memória. */
  summary: FocusSession | null;
  /** Título da aba mostra “Sessão concluída” até o usuário interagir. */
  titleAlert: boolean;
  setSummary(session: FocusSession | null): void;
  setTitleAlert(on: boolean): void;
}

export const useFocusUi = create<FocusUiState>()((set) => ({
  summary: null,
  titleAlert: false,
  setSummary: (summary) => set({ summary }),
  setTitleAlert: (titleAlert) => set({ titleAlert }),
}));
