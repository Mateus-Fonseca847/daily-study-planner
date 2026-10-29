import { isExam, type ContentItem, type DataSnapshot, type StudyEvent } from '@daily/shared';
import type { Draft } from './repository';

export type SubjectDeletion =
  { kind: 'delete-events' } | { kind: 'move-events'; toSubjectId: string };

export const eventsOfSubject = (snapshot: DataSnapshot, subjectId: string): StudyEvent[] =>
  snapshot.events.filter((event) => event.subjectId === subjectId);

/** Remove eventos e desvincula blocos de estudo que apontavam para provas removidas. */
export function removeEvents(snapshot: DataSnapshot, ids: ReadonlySet<string>): DataSnapshot {
  return {
    ...snapshot,
    events: snapshot.events
      .filter((event) => !ids.has(event.id))
      .map((event) =>
        event.type === 'estudo' && event.examId !== null && ids.has(event.examId)
          ? { ...event, examId: null }
          : event,
      ),
  };
}

/**
 * Exclui a matéria. Se houver eventos associados, `resolution` é obrigatória:
 * apagar os eventos ou movê-los para outra matéria existente.
 */
export function applySubjectDeletion(
  snapshot: DataSnapshot,
  subjectId: string,
  resolution?: SubjectDeletion,
): DataSnapshot {
  const owned = eventsOfSubject(snapshot, subjectId);
  const subjects = snapshot.subjects.filter((s) => s.id !== subjectId);

  if (owned.length === 0) return { ...snapshot, subjects };
  if (!resolution) {
    throw new Error('A matéria tem eventos: escolha apagá-los ou movê-los para outra matéria.');
  }
  if (resolution.kind === 'delete-events') {
    return removeEvents({ ...snapshot, subjects }, new Set(owned.map((e) => e.id)));
  }
  if (!subjects.some((s) => s.id === resolution.toSubjectId)) {
    throw new Error('A matéria de destino não existe.');
  }
  return {
    subjects,
    events: snapshot.events.map((event) =>
      event.subjectId === subjectId ? { ...event, subjectId: resolution.toSubjectId } : event,
    ),
  };
}

/** Cópia do evento: título “(cópia)”, pendente e, nas provas, conteúdos desmarcados. */
export function duplicateEventDraft(event: StudyEvent, newId: () => string): Draft<StudyEvent> {
  const { id: _id, ...rest } = event;
  void _id;
  const copy = { ...rest, title: `${event.title} (cópia)`, status: 'pendente' as const };
  if (isExam(event)) {
    const contents: ContentItem[] = event.contents.map((c) => ({ ...c, id: newId(), done: false }));
    return { ...copy, type: 'prova', contents } as Draft<StudyEvent>;
  }
  return copy as Draft<StudyEvent>;
}
