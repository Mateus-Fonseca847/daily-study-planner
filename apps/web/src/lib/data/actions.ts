import type { DataSnapshot } from '@daily/shared';
import { useToasts } from '../toast-store';
import type { Draft } from './repository';
import type { Recurrence, StudyEvent } from '@daily/shared';
import { findView } from '../recurrence/expand';
import { useData } from './app-store';
import type { EditScope } from './series';
import type { SubjectDeletion } from './rules';

/** Evento avulso, série ou ocorrência (`serie@data`) pelo id. */
const viewOf = (id: string) => {
  const { events, exceptions } = useData.getState();
  return findView(events, exceptions, id);
};

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
  const event = viewOf(id);
  if (!event) return;
  const next = event.status === 'concluido' ? 'pendente' : 'concluido';
  withUndo(next === 'concluido' ? `“${event.title}” concluída` : `“${event.title}” reaberta`, () =>
    useData.getState().setEventStatus(id, next),
  );
}

/** Cancelar (menu “…”), com toast “Desfazer”. */
export function cancelEventWithUndo(id: string): void {
  const event = viewOf(id);
  if (!event) return;
  withUndo(`“${event.title}” cancelada`, () => useData.getState().setEventStatus(id, 'cancelado'));
}

/** Marca ou desfaz dias de descanso (este hábito ou todos), com toast “Desfazer”. */
export function setRestDaysWithUndo(
  habitId: string | null,
  dates: readonly string[],
  rest: boolean,
): void {
  const who = habitId === null ? 'todos os hábitos' : 'este hábito';
  const days = dates.length === 1 ? 'dia' : `${dates.length} dias`;
  const message = rest ? `Descanso marcado (${days}, ${who})` : 'Descanso desfeito';
  withUndo(message, () => useData.getState().setRestDays(habitId, dates, rest));
}

const SCOPE_TEXT: Record<EditScope, string> = {
  esta: 'só nesta ocorrência',
  proximas: 'nesta e nas próximas',
  todas: 'em todas as ocorrências',
};

/** Edita uma ocorrência de série com o escopo escolhido, com toast “Desfazer”. */
export function editOccurrenceWithUndo(
  id: string,
  scope: EditScope,
  draft: Draft<StudyEvent>,
): void {
  withUndo(`Alteração salva ${SCOPE_TEXT[scope]}`, () =>
    useData.getState().editOccurrence(id, scope, draft, new Date()),
  );
}

/** Exclui com escopo (pular esta, encerrar a série ou excluir tudo), com toast “Desfazer”. */
export function deleteOccurrenceWithUndo(id: string, scope: EditScope): void {
  const title = viewOf(id)?.title ?? 'Tarefa';
  const text: Record<EditScope, string> = {
    esta: `Ocorrência de “${title}” excluída`,
    proximas: `“${title}” excluída desta em diante`,
    todas: `Série “${title}” excluída`,
  };
  withUndo(text[scope], () => useData.getState().deleteOccurrence(id, scope));
}

/** Define ou tira a repetição (“Repetir…”), com toast “Desfazer”. */
export function setRecurrenceWithUndo(eventId: string, recurrence: Recurrence | null): void {
  withUndo(recurrence ? 'Repetição definida' : 'Repetição removida', () =>
    useData.getState().setRecurrence(eventId, recurrence),
  );
}
