import type { EventType, StudyEvent } from '@daily/shared';

/** Pontos coloridos mostrados por dia no Mês compacto (celular). */
export const MAX_DOTS = 3;

export interface DayMarks {
  /** Tipos distintos de evento do dia, na ordem do primeiro horário (no máximo `MAX_DOTS`). */
  types: EventType[];
  /** Eventos além dos representados pelos pontos (aparece como contagem “+N”). */
  extra: number;
  total: number;
}

/**
 * Pontos de um dia no Mês compacto: um por tipo de evento (até 3). Quando há mais eventos do que
 * pontos, `extra` diz quantos ficaram de fora, e a célula mostra “+N”.
 */
export function compactDayMarks(events: readonly StudyEvent[]): DayMarks {
  const ordered = [...events].sort((a, b) => a.start.localeCompare(b.start));
  const types: EventType[] = [];
  for (const event of ordered) {
    if (!types.includes(event.type) && types.length < MAX_DOTS) types.push(event.type);
  }
  return { types, extra: Math.max(0, events.length - types.length), total: events.length };
}

/** Agenda do dia selecionado: por horário (dia inteiro/sem hora primeiro, em ordem de início). */
export function dayAgenda(events: readonly StudyEvent[]): StudyEvent[] {
  return [...events].sort((a, b) => a.start.localeCompare(b.start));
}

/** Rótulo de acessibilidade da célula: “29 de outubro, 3 eventos”. */
export function dayCellLabel(dayLabel: string, total: number, isToday: boolean): string {
  const count = total === 0 ? 'sem eventos' : total === 1 ? '1 evento' : `${total} eventos`;
  return `${dayLabel}${isToday ? ' (hoje)' : ''}, ${count}`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export interface DaySummaryInput {
  /** Hábitos agendados no dia e quantos faltam marcar. */
  scheduledHabits: number;
  pendingHabits: number;
  /** O dia já passou ou é hoje (hábitos “pendentes”); senão são “agendados”. */
  habitsActionable: boolean;
  /** Contagem regressiva da próxima prova (ex.: “em 3 dias”), se houver. */
  examCountdown: string | null;
}

/** Resumo em uma linha do painel do Dia (celular): “2 hábitos pendentes · prova em 3 dias”. */
export function daySummary({
  scheduledHabits,
  pendingHabits,
  habitsActionable,
  examCountdown,
}: DaySummaryInput): string {
  const parts: string[] = [];
  if (scheduledHabits === 0) parts.push('Sem hábitos');
  else if (!habitsActionable)
    parts.push(plural(scheduledHabits, 'hábito agendado', 'hábitos agendados'));
  else if (pendingHabits === 0) parts.push('Hábitos em dia');
  else parts.push(plural(pendingHabits, 'hábito pendente', 'hábitos pendentes'));
  parts.push(examCountdown ? `prova ${examCountdown}` : 'sem prova à vista');
  return parts.join(' · ');
}
