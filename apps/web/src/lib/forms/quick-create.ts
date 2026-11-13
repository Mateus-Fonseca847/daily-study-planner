import { setHours, setMinutes, setSeconds } from 'date-fns';
import type { Recurrence, StudyEvent } from '@daily/shared';
import { toLocalIso } from '../dates';
import type { Draft } from '../data/repository';

/** O que a entrada rápida entendeu (ver `lib/tasks/quick-parse`). */
export interface QuickOptions {
  date?: string;
  time?: string;
  recurrence?: Recurrence;
}

/** Tarefa rápida: prazo hoje às 23:59, ou o dia, a hora e a repetição entendidos no texto. */
export function quickTaskDraft(
  title: string,
  now: Date,
  options: QuickOptions = {},
): Draft<StudyEvent> {
  const fallback = toLocalIso(setSeconds(setMinutes(setHours(now, 23), 59), 0));
  const due =
    options.date || options.time
      ? `${options.date ?? fallback.slice(0, 10)}T${options.time ?? '23:59'}:00`
      : fallback;
  return {
    ...(options.recurrence ? { recurrence: options.recurrence } : {}),
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
