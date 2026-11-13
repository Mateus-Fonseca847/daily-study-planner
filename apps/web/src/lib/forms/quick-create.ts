import { setHours, setMinutes, setSeconds } from 'date-fns';
import type { StudyEvent } from '@daily/shared';
import { toLocalIso } from '../dates';
import type { Draft } from '../data/repository';

/** Tarefa rápida: prazo hoje às 23:59. */
export function quickTaskDraft(title: string, now: Date): Draft<StudyEvent> {
  const due = toLocalIso(setSeconds(setMinutes(setHours(now, 23), 59), 0));
  return {
    type: 'tarefa',
    title,
    subjectId: null,
    status: 'pendente',
    start: due,
    end: due,
    notes: '',
    subtasks: [],
    createdAt: toLocalIso(now),
  };
}
