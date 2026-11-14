import { addDays, differenceInCalendarDays, endOfWeek, parseISO, startOfDay } from 'date-fns';
import { isOpen, type EventType, type OccurrenceException, type StudyEvent } from '@daily/shared';
import { dayKey, shiftDay, toLocalIso } from '../dates';
import { asView, expandEvents, type EventView } from '../recurrence/expand';

/** Concluídas que a página Tarefas mostra (dias para trás a partir de hoje). */
export const DONE_WINDOW_DAYS = 30;
/**
 * Ocorrências de série pendentes contam como atrasadas por até 7 dias; mais antigas são
 * “perdidas” (não aparecem como atrasadas; entram nas estatísticas). Tarefas avulsas continuam
 * atrasadas sem limite.
 */
export const OVERDUE_WINDOW_DAYS = 7;
/** Até onde procurar a próxima ocorrência pendente de cada série. */
const NEXT_SEARCH_DAYS = 400;

export type UpcomingGroup = 'amanha' | 'esta-semana' | 'mais-tarde';

/** Linha de Próximas: numa série, a próxima ocorrência e quantas mais caem nesta semana. */
export type UpcomingItem = EventView & { moreThisWeek: number };

export interface TaskSections {
  atrasadas: EventView[];
  hoje: EventView[];
  /** Avulsas futuras e a próxima ocorrência de cada série (sem limite de dias), agrupadas. */
  proximas: { group: UpcomingGroup; items: UpcomingItem[] }[];
  /** Concluídas dos últimos 30 dias, mais recentes primeiro. */
  concluidas: EventView[];
  /** Ocorrências pendentes mais antigas que a janela de atrasadas (só para estatísticas). */
  perdidas: EventView[];
}

/** O prazo do compromisso é o término (igual ao início num compromisso pontual). */
export const dueOf = (event: StudyEvent): string => event.end;

const byDue = (a: StudyEvent, b: StudyEvent) => dueOf(a).localeCompare(dueOf(b));

/** Semana de segunda a domingo (como nas estatísticas). */
const weekEnd = (now: Date) => endOfWeek(now, { weekStartsOn: 1 });

interface Split {
  oneOff: EventView[];
  /** Ocorrências das séries na janela de trás (concluídas/atrasadas/perdidas) até o fim da semana. */
  recent: EventView[];
  series: StudyEvent[];
}

function split(
  events: readonly StudyEvent[],
  exceptions: readonly OccurrenceException[],
  now: Date,
): Split {
  const today = dayKey(now);
  const series = events.filter((e) => e.recurrence);
  const oneOff = events.filter((e) => !e.recurrence).map(asView);
  const recent = expandEvents(
    series,
    exceptions,
    { from: shiftDay(today, -DONE_WINDOW_DAYS), to: dayKey(weekEnd(now)) },
    today,
  );
  return { oneOff, recent, series };
}

/** Divide os compromissos nas seções da página Tarefas. Função pura: “agora” é injetado. */
export function taskSections(
  events: readonly StudyEvent[],
  now: Date,
  exceptions: readonly OccurrenceException[] = [],
): TaskSections {
  const nowIso = toLocalIso(now);
  const today = startOfDay(now);
  const todayKey = dayKey(now);
  const overdueFrom = shiftDay(todayKey, -OVERDUE_WINDOW_DAYS);
  const daysUntil = (e: StudyEvent) => differenceInCalendarDays(parseISO(dueOf(e)), today);
  const { oneOff, recent, series } = split(events, exceptions, now);

  const openOneOff = oneOff.filter(isOpen);
  const openRecent = recent.filter(isOpen);
  const late = (e: EventView) => dueOf(e) < nowIso;

  const atrasadas = [
    ...openOneOff.filter(late),
    ...openRecent.filter((e) => late(e) && dueOf(e).slice(0, 10) >= overdueFrom),
  ].sort(byDue);
  const perdidas = openRecent.filter((e) => dueOf(e).slice(0, 10) < overdueFrom).sort(byDue);
  const hoje = [...openOneOff, ...openRecent]
    .filter((e) => !late(e) && daysUntil(e) === 0)
    .sort(byDue);

  // Próximas: avulsas futuras e, de cada série, só a próxima ocorrência pendente.
  const tomorrow = shiftDay(todayKey, 1);
  const weekLast = dayKey(weekEnd(now));
  const nextOfSeries: UpcomingItem[] = [];
  for (const s of series) {
    const ahead = expandEvents([s], exceptions, {
      from: tomorrow,
      to: shiftDay(tomorrow, NEXT_SEARCH_DAYS),
    }).filter(isOpen);
    const [first, ...rest] = ahead.sort(byDue);
    if (!first) continue;
    const moreThisWeek = rest.filter((e) => e.start.slice(0, 10) <= weekLast).length;
    nextOfSeries.push({ ...first, moreThisWeek });
  }
  const future: UpcomingItem[] = [
    ...openOneOff.filter((e) => daysUntil(e) >= 1).map((e) => ({ ...e, moreThisWeek: 0 })),
    ...nextOfSeries,
  ].sort(byDue);
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
  const concluidas = [...oneOff, ...recent]
    .filter(
      (e) =>
        e.status === 'concluido' &&
        dueOf(e) >= doneFrom &&
        dueOf(e) <= toLocalIso(addDays(today, 1)),
    )
    .sort(byDue)
    .reverse();
  return { atrasadas, hoje, proximas, concluidas, perdidas };
}

/**
 * Pendentes que “contam” (sidebar e cartões): avulsas pendentes e, das séries, as ocorrências
 * pendentes de hoje e as atrasadas dentro da janela (o futuro de uma série não conta: seria
 * infinito).
 */
export function pendingNow(
  events: readonly StudyEvent[],
  exceptions: readonly OccurrenceException[],
  now: Date,
): EventView[] {
  const todayKey = dayKey(now);
  const overdueFrom = shiftDay(todayKey, -OVERDUE_WINDOW_DAYS);
  const { oneOff, recent } = split(events, exceptions, now);
  return [
    ...oneOff.filter(isOpen),
    ...recent.filter((e) => {
      const day = dueOf(e).slice(0, 10);
      return isOpen(e) && day >= overdueFrom && day <= todayKey;
    }),
  ];
}

/** Filtro global por tipo: conjunto vazio = todos. */
export function filterByType<T extends Pick<StudyEvent, 'type'>>(
  events: readonly T[],
  types: ReadonlySet<EventType>,
): T[] {
  return types.size === 0 ? [...events] : events.filter((e) => types.has(e.type));
}
