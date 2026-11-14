import { addDays } from 'date-fns';
import {
  isExam,
  isOpen,
  type Exam,
  type OccurrenceException,
  type StudyEvent,
} from '@daily/shared';
import { pendingNow } from '../tasks/sections';
import { toLocalIso } from '../dates';

/** Janela dos “próximos” da sidebar (dias). */
export const UPCOMING_EXAM_DAYS = 14;

export interface NavCounts {
  provas: number;
  tarefas: number;
  /** Hábitos agendados hoje e ainda não cumpridos. */
  habitos: number;
}

/** Provas abertas que começam nos próximos 14 dias. */
export function upcomingExams(events: readonly StudyEvent[], now: Date): Exam[] {
  const nowIso = toLocalIso(now);
  const limit = toLocalIso(addDays(now, UPCOMING_EXAM_DAYS));
  return events.filter(isExam).filter((e) => isOpen(e) && e.end >= nowIso && e.start <= limit);
}

export function navCounts(
  events: readonly StudyEvent[],
  now: Date,
  habitos = 0,
  exceptions: readonly OccurrenceException[] = [],
): NavCounts {
  return {
    provas: upcomingExams(events, now).length,
    tarefas: pendingNow(events, exceptions, now).filter((e) => e.type === 'tarefa').length,
    habitos,
  };
}
