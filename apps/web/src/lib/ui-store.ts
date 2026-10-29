import { create } from 'zustand';
import type { EventType, StudyEvent, Subject } from '@daily/shared';

export type ModalState =
  | null
  | { kind: 'event'; event?: StudyEvent; type?: EventType; date?: string }
  | { kind: 'subject'; subject?: Subject }
  | { kind: 'subject-delete'; subject: Subject };

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

export const openEventForm = (init: { event?: StudyEvent; type?: EventType; date?: string } = {}) =>
  useUi.getState().open({ kind: 'event', ...init });
export const openSubjectForm = (subject?: Subject) =>
  useUi.getState().open({ kind: 'subject', ...(subject ? { subject } : {}) });
