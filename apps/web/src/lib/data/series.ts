import {
  occurrenceId,
  parseOccurrenceId,
  type DataSnapshot,
  type EventStatus,
  type OccurrenceException,
  type Recurrence,
  type StudyEvent,
} from '@daily/shared';
import { shiftDay } from '../dates';
import { buildOccurrence, indexExceptions } from '../recurrence/expand';
import { occurrencesBetween, weekdayOf } from '../recurrence/engine';
import type { Draft } from './repository';

/** Escopo de uma edição ou exclusão numa série. */
export type EditScope = 'esta' | 'proximas' | 'todas';

/** Campos que valem só numa ocorrência (o resto é da série). */
const POINT_FIELDS = ['title', 'start', 'end', 'notes'] as const;

/** A série e a data de uma ocorrência (`serie@aaaa-mm-dd`), ou `null` se não for uma. */
export function seriesOf(
  snapshot: Pick<DataSnapshot, 'events'>,
  id: string,
): { series: StudyEvent & { recurrence: Recurrence }; date: string } | null {
  const parsed = parseOccurrenceId(id);
  if (!parsed) return null;
  const series = snapshot.events.find((e) => e.id === parsed.eventId);
  return series?.recurrence
    ? { series: series as StudyEvent & { recurrence: Recurrence }, date: parsed.date }
    : null;
}

/** Remove a exceção que não muda nada (sem alterações, status nem subtarefas marcadas). */
function isEmpty(ex: OccurrenceException): boolean {
  return (
    ex.kind === 'alterada' &&
    (!ex.changes || Object.keys(ex.changes).length === 0) &&
    ex.status === undefined &&
    (!ex.doneSubtasks || ex.doneSubtasks.length === 0)
  );
}

/** Cria ou atualiza a exceção da ocorrência (e a remove se ficar vazia). */
function upsertException(
  snapshot: DataSnapshot,
  eventId: string,
  date: string,
  update: (current: OccurrenceException) => OccurrenceException,
): DataSnapshot {
  const id = occurrenceId(eventId, date);
  const current = snapshot.exceptions.find((e) => e.id === id) ?? {
    id,
    eventId,
    originalDate: date,
    kind: 'alterada' as const,
  };
  const next = update(current);
  const rest = snapshot.exceptions.filter((e) => e.id !== id);
  return { ...snapshot, exceptions: isEmpty(next) ? rest : [...rest, next] };
}

/** Status de uma ocorrência (concluir/cancelar/reabrir nunca perguntam o escopo). */
export function setOccurrenceStatus(
  snapshot: DataSnapshot,
  id: string,
  status: EventStatus,
): DataSnapshot {
  const found = seriesOf(snapshot, id);
  if (!found) return snapshot;
  return upsertException(snapshot, found.series.id, found.date, (ex) => {
    const { status: _old, ...rest } = ex;
    void _old;
    return status === 'pendente' ? rest : { ...rest, status };
  });
}

/** Marca/desmarca uma subtarefa só nesta ocorrência (as subtarefas da série são o modelo). */
export function toggleOccurrenceSubtask(
  snapshot: DataSnapshot,
  id: string,
  subtaskId: string,
): DataSnapshot {
  const found = seriesOf(snapshot, id);
  if (!found) return snapshot;
  return upsertException(snapshot, found.series.id, found.date, (ex) => {
    const done = new Set(ex.doneSubtasks ?? []);
    if (done.has(subtaskId)) done.delete(subtaskId);
    else done.add(subtaskId);
    return { ...ex, doneSubtasks: [...done] };
  });
}

/** Índice (posição na série) da ocorrência de `date`. */
function indexOf(series: StudyEvent & { recurrence: Recurrence }, date: string): number {
  const anchor = series.start.slice(0, 10);
  return occurrencesBetween(series.recurrence, anchor, { from: date, to: date })[0]?.index ?? 0;
}

/**
 * Explicita o que a regra deduz da data inicial (dia da semana, dia do mês), para a série nova de
 * “esta e as próximas” manter o mesmo padrão mesmo começando noutro dia.
 */
function materialize(rule: Recurrence, anchor: string): Recurrence {
  if (rule.freq === 'semanal' && !rule.weekdays) return { ...rule, weekdays: [weekdayOf(anchor)] };
  if (rule.freq === 'mensal' && rule.monthDay === undefined) {
    return { ...rule, monthDay: Number(anchor.slice(8, 10)) };
  }
  return rule;
}

/** Diferenças pontuais da edição em relação à ocorrência calculada. */
function pointChanges(
  series: StudyEvent,
  date: string,
  draft: Draft<StudyEvent>,
): OccurrenceException['changes'] {
  const base = buildOccurrence(series, date)!;
  const changes: NonNullable<OccurrenceException['changes']> = {};
  for (const key of POINT_FIELDS) {
    if (draft[key] !== base[key]) changes[key] = draft[key];
  }
  return changes;
}

/** A edição mexe em algo que não é pontual (tipo, matéria, repetição, subtarefas)? */
export function changesSeriesFields(series: StudyEvent, draft: Draft<StudyEvent>): boolean {
  return (
    draft.type !== series.type ||
    draft.subjectId !== series.subjectId ||
    JSON.stringify(draft.recurrence ?? null) !== JSON.stringify(series.recurrence ?? null) ||
    JSON.stringify(draft.subtasks.map((s) => [s.id, s.title])) !==
      JSON.stringify(series.subtasks.map((s) => [s.id, s.title]))
  );
}

/**
 * Aplica a edição de uma ocorrência com o escopo escolhido.
 * - `esta`: só os campos pontuais (título, horário, notas) viram exceção desta ocorrência.
 * - `todas`: altera a série (a data inicial fica; horário e o resto vêm da edição). Exceções com
 *   o mesmo campo alterado preservam o seu.
 * - `proximas`: a série termina na véspera e nasce uma série nova nesta data com a edição; as
 *   exceções desta data em diante passam para a nova (o “após N” é dividido).
 */
export function applyOccurrenceEdit(
  snapshot: DataSnapshot,
  id: string,
  scope: EditScope,
  draft: Draft<StudyEvent>,
  newId: () => string,
  createdAt: string,
): DataSnapshot {
  const found = seriesOf(snapshot, id);
  if (!found) return snapshot;
  const { series, date } = found;

  if (scope === 'esta') {
    const changes = pointChanges(series, date, draft);
    return upsertException(snapshot, series.id, date, (ex) => ({
      ...ex,
      changes: { ...(ex.changes ?? {}), ...changes },
    }));
  }

  const anchor = series.start.slice(0, 10);
  const time = (iso: string) => iso.slice(11);
  const keepStatus = { status: series.status, createdAt: series.createdAt };

  if (scope === 'todas' || date === anchor) {
    const updated: StudyEvent = {
      ...series,
      ...draft,
      ...keepStatus,
      id: series.id,
      start: `${anchor}T${time(draft.start)}`,
      end: `${anchor}T${time(draft.end)}`,
    };
    if (draft.recurrence === undefined) delete updated.recurrence;
    const events = snapshot.events.map((e) => (e.id === series.id ? updated : e));
    // Sem repetição, as exceções da série deixam de existir.
    const exceptions = updated.recurrence
      ? snapshot.exceptions
      : snapshot.exceptions.filter((e) => e.eventId !== series.id);
    return { ...snapshot, events, exceptions };
  }

  // “Esta e as próximas”.
  const index = indexOf(series, date);
  const oldRule = materialize(series.recurrence, anchor);
  const newRuleBase = draft.recurrence ? materialize(draft.recurrence, anchor) : undefined;
  const remaining =
    series.recurrence.end.kind === 'apos' ? series.recurrence.end.count - index : undefined;
  const ended: StudyEvent = {
    ...series,
    recurrence: { ...oldRule, end: { kind: 'em', date: shiftDay(date, -1) } },
  };
  const nextId = newId();
  const next: StudyEvent = {
    ...series,
    ...draft,
    id: nextId,
    status: 'pendente',
    createdAt,
    start: `${date}T${time(draft.start)}`,
    end: `${date}T${time(draft.end)}`,
  };
  if (newRuleBase) {
    next.recurrence =
      remaining !== undefined &&
      draft.recurrence?.end.kind === 'apos' &&
      JSON.stringify(series.recurrence.end) === JSON.stringify(draft.recurrence.end)
        ? { ...newRuleBase, end: { kind: 'apos', count: Math.max(1, remaining) } }
        : newRuleBase;
  } else {
    delete next.recurrence;
  }
  const events = snapshot.events.flatMap((e) => (e.id === series.id ? [ended, next] : [e]));
  const exceptions = snapshot.exceptions.flatMap((ex) => {
    if (ex.eventId !== series.id || ex.originalDate < date) return [ex];
    if (!next.recurrence) return [];
    return [{ ...ex, eventId: nextId, id: occurrenceId(nextId, ex.originalDate) }];
  });
  return { ...snapshot, events, exceptions };
}

/**
 * Exclui com escopo. `esta`: pula a ocorrência. `proximas`: a série termina na véspera (ou some,
 * se for a primeira). `todas`: remove a série e as exceções dela.
 */
export function deleteOccurrence(
  snapshot: DataSnapshot,
  id: string,
  scope: EditScope,
): DataSnapshot {
  const found = seriesOf(snapshot, id);
  if (!found) return snapshot;
  const { series, date } = found;
  const anchor = series.start.slice(0, 10);
  const dropSeries = (): DataSnapshot => ({
    ...snapshot,
    events: snapshot.events.filter((e) => e.id !== series.id),
    exceptions: snapshot.exceptions.filter((e) => e.eventId !== series.id),
  });

  if (scope === 'todas' || (scope === 'proximas' && date === anchor)) return dropSeries();
  if (scope === 'esta') {
    return upsertException(snapshot, series.id, date, (ex) => {
      const { changes: _c, status: _s, doneSubtasks: _d, ...rest } = ex;
      void _c;
      void _s;
      void _d;
      return { ...rest, kind: 'pulada' };
    });
  }
  const rule = materialize(series.recurrence, anchor);
  const ended: StudyEvent = {
    ...series,
    recurrence: { ...rule, end: { kind: 'em', date: shiftDay(date, -1) } },
  };
  return {
    ...snapshot,
    events: snapshot.events.map((e) => (e.id === series.id ? ended : e)),
    exceptions: snapshot.exceptions.filter(
      (ex) => ex.eventId !== series.id || ex.originalDate < date,
    ),
  };
}

/** Define (ou tira) a repetição de um compromisso (“Repetir…” do menu “…”). */
export function setRecurrence(
  snapshot: DataSnapshot,
  eventId: string,
  recurrence: Recurrence | null,
): DataSnapshot {
  const events = snapshot.events.map((e) => {
    if (e.id !== eventId) return e;
    const { recurrence: _old, ...rest } = e;
    void _old;
    return recurrence ? { ...rest, recurrence, status: 'pendente' as const } : rest;
  });
  const exceptions = recurrence
    ? snapshot.exceptions
    : snapshot.exceptions.filter((ex) => ex.eventId !== eventId);
  return { ...snapshot, events, exceptions };
}

/** Exceção atual de uma ocorrência (para o painel). */
export const exceptionOf = (snapshot: Pick<DataSnapshot, 'exceptions'>, id: string) =>
  indexExceptions(snapshot.exceptions).get(id);
