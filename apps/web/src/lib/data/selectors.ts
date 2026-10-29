import { addDays } from 'date-fns';
import { isExam, isOpen, isTask, type Exam, type StudyEvent, type Task } from '@daily/shared';
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

/** Tarefas pendentes ou em andamento (inclui atrasadas). */
export const openTasks = (events: readonly StudyEvent[]): Task[] =>
  events.filter(isTask).filter(isOpen);

export function navCounts(events: readonly StudyEvent[], now: Date, habitos = 0): NavCounts {
  return {
    provas: upcomingExams(events, now).length,
    tarefas: openTasks(events).length,
    habitos,
  };
}
