import type { DataSnapshot } from '@daily/shared';
import { useToasts } from '../toast-store';
import { useData } from './app-store';
import type { SubjectDeletion } from './rules';

/** Mostra um toast “Desfazer” que restaura o estado de antes da mutação. */
function withUndo(message: string, mutate: () => void): void {
  const before: DataSnapshot = useData.getState().snapshot();
  mutate();
  useToasts.getState().push({
    message,
    actionLabel: 'Desfazer',
    onAction: () => useData.getState().replaceAll(before),
  });
}

export function deleteEventWithUndo(id: string): void {
  const event = useData.getState().events.find((e) => e.id === id);
  withUndo(`“${event?.title ?? 'Evento'}” excluído`, () => useData.getState().deleteEvent(id));
}

export function deleteSubjectWithUndo(id: string, resolution?: SubjectDeletion): void {
  const subject = useData.getState().subjects.find((s) => s.id === id);
  withUndo(`Matéria “${subject?.name ?? ''}” excluída`, () =>
    useData.getState().deleteSubject(id, resolution),
  );
}

export function deleteHabitWithUndo(id: string): void {
  const habit = useData.getState().habits.find((h) => h.id === id);
  withUndo(`Hábito “${habit?.name ?? ''}” excluído`, () => useData.getState().deleteHabit(id));
}

export function duplicateEventWithToast(id: string): void {
  const copy = useData.getState().duplicateEvent(id, new Date());
  if (copy) useToasts.getState().push({ message: `“${copy.title}” criado` });
}

/** Concluir/reabrir com um clique (chips, linhas e painel), com toast “Desfazer”. */
export function toggleDoneWithUndo(id: string): void {
  const event = useData.getState().events.find((e) => e.id === id);
  if (!event) return;
  const next = event.status === 'concluido' ? 'pendente' : 'concluido';
  withUndo(next === 'concluido' ? `“${event.title}” concluída` : `“${event.title}” reaberta`, () =>
    useData.getState().setEventStatus(id, next),
  );
}

/** Cancelar (menu “…”), com toast “Desfazer”. */
export function cancelEventWithUndo(id: string): void {
  const event = useData.getState().events.find((e) => e.id === id);
  if (!event) return;
  withUndo(`“${event.title}” cancelada`, () => useData.getState().setEventStatus(id, 'cancelado'));
}
