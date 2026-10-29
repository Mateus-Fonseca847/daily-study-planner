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

export function duplicateEventWithToast(id: string): void {
  const copy = useData.getState().duplicateEvent(id);
  if (copy) useToasts.getState().push({ message: `“${copy.title}” criado` });
}
