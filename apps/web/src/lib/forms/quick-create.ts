import { addHours, format, setHours, setMinutes, setSeconds } from 'date-fns';
import type { StudyBlock, Task } from '@daily/shared';
import { toLocalIso } from '../dates';
import type { Draft } from '../data/repository';

/** Última hora cheia em que um bloco de 1 h ainda cabe no mesmo dia. */
const LAST_BLOCK_START_HOUR = 22;

/** Tarefa rápida: prazo hoje às 23:59. */
export function quickTaskDraft(title: string, now: Date): Draft<Task> {
  const due = toLocalIso(setSeconds(setMinutes(setHours(now, 23), 59), 0));
  return {
    type: 'entrega',
    title,
    subjectId: null,
    status: 'pendente',
    start: due,
    end: due,
    notes: '',
  };
}

/** Bloco rápido: próxima hora cheia de hoje (no máximo 22h), com 1 h de duração. */
export function quickBlockDraft(
  title: string,
  now: Date,
  links: { subjectId: string | null; examId: string | null },
): Draft<StudyBlock> {
  const hour = Math.min(now.getHours() + 1, LAST_BLOCK_START_HOUR);
  const start = setSeconds(setMinutes(setHours(now, hour), 0), 0);
  return {
    type: 'estudo',
    title,
    subjectId: links.subjectId,
    examId: links.examId,
    status: 'pendente',
    start: toLocalIso(start),
    end: toLocalIso(addHours(start, 1)),
    notes: '',
  };
}

export const dayKeyOf = (date: Date): string => format(date, 'yyyy-MM-dd');
