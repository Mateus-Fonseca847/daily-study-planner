import { addDays, differenceInCalendarDays, endOfWeek, parseISO, startOfDay } from 'date-fns';
import { isOpen, type EventType, type StudyEvent } from '@daily/shared';
import { toLocalIso } from '../dates';

/** Concluídas que a página Tarefas mostra (dias para trás a partir de hoje). */
export const DONE_WINDOW_DAYS = 30;

export type UpcomingGroup = 'amanha' | 'esta-semana' | 'mais-tarde';

export interface TaskSections {
  atrasadas: StudyEvent[];
  hoje: StudyEvent[];
  /** Todas as futuras (sem limite de dias), já agrupadas. */
  proximas: { group: UpcomingGroup; items: StudyEvent[] }[];
  /** Concluídas dos últimos 30 dias, mais recentes primeiro. */
  concluidas: StudyEvent[];
}

export interface TaskSummary {
  concluidasSemana: number;
  pendentes: number;
  atrasadas: number;
  proximasProvas: number;
}

/** O prazo do compromisso é o término (igual ao início num compromisso pontual). */
export const dueOf = (event: StudyEvent): string => event.end;

const byDue = (a: StudyEvent, b: StudyEvent) => dueOf(a).localeCompare(dueOf(b));

/** Semana de segunda a domingo (como nas estatísticas). */
const weekEnd = (now: Date) => endOfWeek(now, { weekStartsOn: 1 });

/** Divide os compromissos nas seções da página Tarefas. Função pura: “agora” é injetado. */
export function taskSections(events: readonly StudyEvent[], now: Date): TaskSections {
  const nowIso = toLocalIso(now);
  const today = startOfDay(now);
  const daysUntil = (e: StudyEvent) => differenceInCalendarDays(parseISO(dueOf(e)), today);
  const open = events.filter(isOpen).sort(byDue);

  const atrasadas = open.filter((e) => dueOf(e) < nowIso);
  const hoje = open.filter((e) => dueOf(e) >= nowIso && daysUntil(e) === 0);
  const future = open.filter((e) => daysUntil(e) >= 1);
  const lastOfWeek = differenceInCalendarDays(weekEnd(now), today);
  const groupOf = (e: StudyEvent): UpcomingGroup => {
    const days = daysUntil(e);
    if (days === 1) return 'amanha';
    return days <= lastOfWeek ? 'esta-semana' : 'mais-tarde';
  };
  const proximas = (['amanha', 'esta-semana', 'mais-tarde'] as const)
    .map((group) => ({ group, items: future.filter((e) => groupOf(e) === group) }))
    .filter((g) => g.items.length > 0);

  const doneFrom = toLocalIso(addDays(today, -DONE_WINDOW_DAYS));
  const concluidas = events
    .filter((e) => e.status === 'concluido' && dueOf(e) >= doneFrom)
    .sort(byDue)
    .reverse();
  return { atrasadas, hoje, proximas, concluidas };
}

/** Números dos cartões-resumo. */
export function taskSummary(events: readonly StudyEvent[], now: Date): TaskSummary {
  const nowIso = toLocalIso(now);
  const weekStart = toLocalIso(addDays(startOfDay(weekEnd(now)), -6));
  const weekLimit = toLocalIso(weekEnd(now));
  const open = events.filter(isOpen);
  return {
    concluidasSemana: events.filter(
      (e) => e.status === 'concluido' && dueOf(e) >= weekStart && dueOf(e) <= weekLimit,
    ).length,
    pendentes: open.length,
    atrasadas: open.filter((e) => dueOf(e) < nowIso).length,
    proximasProvas: open.filter((e) => e.type === 'prova' && e.start >= nowIso).length,
  };
}

/** Filtro global por tipo: conjunto vazio = todos. */
export function filterByType<T extends Pick<StudyEvent, 'type'>>(
  events: readonly T[],
  types: ReadonlySet<EventType>,
): T[] {
  return types.size === 0 ? [...events] : events.filter((e) => types.has(e.type));
}
