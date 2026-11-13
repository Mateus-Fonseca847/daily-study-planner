import { create } from 'zustand';
import type { EventType, Habit, StudyEvent, Subject } from '@daily/shared';

export type ModalState =
  | null
  | { kind: 'event'; eventId?: string; type?: EventType; date?: string; time?: string }
  | { kind: 'subject'; subject?: Subject }
  | { kind: 'habit'; habit?: Habit }
  | { kind: 'subject-delete'; subject: Subject }
  | { kind: 'focus-log' };

interface UiState {
  modal: ModalState;
  open(modal: Exclude<ModalState, null>): void;
  close(): void;
}

/** Qual modal está aberto (formulários abrem a partir da sidebar, do calendário e das páginas). */
export const useUi = create<UiState>()((set) => ({
  modal: null,
  open: (modal) => set({ modal }),
  close: () => set({ modal: null }),
}));

/**
 * Abre o painel de tarefa: com `event`, mostra/edita o compromisso; sem, cria (Tarefa por padrão,
 * com a data e a hora do clique quando vem do calendário).
 */
export const openEventForm = ({
  event,
  ...init
}: { event?: StudyEvent; type?: EventType; date?: string; time?: string } = {}) =>
  useUi.getState().open({ kind: 'event', ...(event ? { eventId: event.id } : {}), ...init });
export const openSubjectForm = (subject?: Subject) =>
  useUi.getState().open({ kind: 'subject', ...(subject ? { subject } : {}) });
export const openHabitForm = (habit?: Habit) =>
  useUi.getState().open({ kind: 'habit', ...(habit ? { habit } : {}) });

/** Registrar tempo de foco à mão (Perfil e Modo Foco). */
export const openFocusLog = () => useUi.getState().open({ kind: 'focus-log' });
