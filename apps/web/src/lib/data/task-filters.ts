import { differenceInCalendarDays, parseISO } from 'date-fns';
import { isOpen, type Task } from '@daily/shared';
import { toLocalIso } from '../dates';

export type TaskFilter = 'hoje' | 'proximos' | 'atrasadas' | 'concluidas';

/** Janela de “Próximos 7 dias”, em dias de calendário a partir de hoje (inclusive). */
export const UPCOMING_TASK_DAYS = 7;

/** Tarefas de cada filtro, ordenadas pelo prazo (concluídas: mais recentes primeiro). */
export function filterTasks(tasks: readonly Task[], filter: TaskFilter, now: Date): Task[] {
  const nowIso = toLocalIso(now);
  const daysUntil = (task: Task) => differenceInCalendarDays(parseISO(task.end), now);
  const matches = (task: Task): boolean => {
    switch (filter) {
      case 'hoje':
        return isOpen(task) && daysUntil(task) === 0;
      case 'proximos':
        return isOpen(task) && daysUntil(task) >= 0 && daysUntil(task) <= UPCOMING_TASK_DAYS;
      case 'atrasadas':
        return isOpen(task) && task.end < nowIso;
      case 'concluidas':
        return task.status === 'concluido';
    }
  };
  const result = tasks.filter(matches).sort((a, b) => a.end.localeCompare(b.end));
  return filter === 'concluidas' ? result.reverse() : result;
}
