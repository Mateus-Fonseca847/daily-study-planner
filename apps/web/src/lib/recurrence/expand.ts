import { addMinutes } from 'date-fns';
import {
  occurrenceId,
  parseOccurrenceId,
  type OccurrenceException,
  type StudyEvent,
} from '@daily/shared';
import { fromLocalIso, minutesBetween, toLocalIso } from '../dates';
import { occurrencesBetween, occursOnDay, type Window } from './engine';

/**
 * Um compromisso como a interface o vê: um evento avulso ou uma ocorrência de série. Mesmo
 * formato de `StudyEvent` (os componentes não mudam); numa ocorrência, `id` é `serie@aaaa-mm-dd`.
 */
export type EventView = StudyEvent & {
  /** Série de origem (o próprio id num evento avulso). */
  seriesId: string;
  /** Dia original da ocorrência; `null` num evento avulso. */
  originalDate: string | null;
};

export const asView = (event: StudyEvent): EventView => ({
  ...event,
  seriesId: event.id,
  originalDate: null,
});

/** A ocorrência do dia `date`, já com a exceção aplicada (ou `null` se ela foi pulada). */
export function buildOccurrence(
  series: StudyEvent,
  date: string,
  exception?: OccurrenceException,
): EventView | null {
  if (exception?.kind === 'pulada') return null;
  const minutes = minutesBetween(series.start, series.end);
  const start = `${date}T${series.start.slice(11)}`;
  const done = new Set(exception?.doneSubtasks ?? []);
  const changes = exception?.changes ?? {};
  return {
    ...series,
    id: occurrenceId(series.id, date),
    seriesId: series.id,
    originalDate: date,
    start,
    end: toLocalIso(addMinutes(fromLocalIso(start), minutes)),
    status: exception?.status ?? 'pendente',
    // As subtarefas da série são o modelo; o estado é desta ocorrência.
    subtasks: series.subtasks.map((s) => ({ ...s, done: done.has(s.id) })),
    ...changes,
  };
}

/** Índice das exceções por id de ocorrência. */
export const indexExceptions = (
  exceptions: readonly OccurrenceException[],
): Map<string, OccurrenceException> => new Map(exceptions.map((e) => [e.id, e]));

/**
 * Expande os compromissos para a janela: eventos avulsos passam como estão (todos, para quem
 * precisa de atrasadas sem limite); séries viram as ocorrências da janela, com as exceções.
 */
export function expandEvents(
  events: readonly StudyEvent[],
  exceptions: readonly OccurrenceException[],
  window: Window,
  today?: string,
): EventView[] {
  const byId = indexExceptions(exceptions);
  const out: EventView[] = [];
  for (const event of events) {
    if (!event.recurrence) {
      out.push(asView(event));
      continue;
    }
    const anchor = event.start.slice(0, 10);
    for (const { date } of occurrencesBetween(event.recurrence, anchor, window, today)) {
      const view = buildOccurrence(event, date, byId.get(occurrenceId(event.id, date)));
      if (view) out.push(view);
    }
  }
  // Ocorrências movidas para dentro da janela a partir de um dia fora dela.
  for (const ex of exceptions) {
    const moved = ex.kind === 'alterada' ? ex.changes?.start?.slice(0, 10) : undefined;
    if (!moved || moved < window.from || moved > window.to) continue;
    if (ex.originalDate >= window.from && ex.originalDate <= window.to) continue;
    const series = events.find((e) => e.id === ex.eventId);
    if (!series?.recurrence) continue;
    if (!occursOnDay(series.recurrence, series.start.slice(0, 10), ex.originalDate)) continue;
    const view = buildOccurrence(series, ex.originalDate, ex);
    if (view) out.push(view);
  }
  return out;
}

/** Acha um compromisso pelo id: um evento avulso, a série ou uma ocorrência (`serie@data`). */
export function findView(
  events: readonly StudyEvent[],
  exceptions: readonly OccurrenceException[],
  id: string,
): EventView | undefined {
  const direct = events.find((e) => e.id === id);
  if (direct) return asView(direct);
  const parsed = parseOccurrenceId(id);
  if (!parsed) return undefined;
  const series = events.find((e) => e.id === parsed.eventId);
  if (!series?.recurrence) return undefined;
  if (!occursOnDay(series.recurrence, series.start.slice(0, 10), parsed.date)) return undefined;
  return buildOccurrence(series, parsed.date, indexExceptions(exceptions).get(id)) ?? undefined;
}
