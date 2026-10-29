import type { StudyEvent } from '@daily/shared';

/** Intervalo de horas padrão da grade (06h às 23h, ou seja, até 24h). */
export const DEFAULT_START_HOUR = 6;
export const DEFAULT_END_HOUR = 24;
/** Hora em que a grade rola quando o dia não é hoje. */
export const DEFAULT_SCROLL_HOUR = 7;
/** Duração visual mínima de um bloco (minutos). */
export const MIN_VISUAL_MIN = 30;
const DAY_MIN = 24 * 60;

/** Pedaço de um item (evento ou hábito com horário) dentro de um único dia. */
export interface Segment {
  /** Id do item de origem (um item que cruza a meia-noite gera um segmento por dia). */
  id: string;
  /** Minutos desde 00:00 do dia. */
  startMin: number;
  /** Fim em minutos (já com a duração visual mínima aplicada; no máximo 24h). */
  endMin: number;
  /** Duração real dentro do dia, antes do mínimo visual. */
  realMin: number;
}

const minutesOf = (iso: string): number =>
  Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));

/**
 * Corta um intervalo `[start, end]` (ISO local) no dia `day`. Itens que cruzam a meia-noite aparecem
 * em cada dia (cada um com o seu pedaço); devolve `null` se o intervalo não toca o dia.
 * Entregas (início = fim) viram um bloco de duração mínima.
 */
export function segmentOnDay(id: string, start: string, end: string, day: string): Segment | null {
  const startDay = start.slice(0, 10);
  const endDay = end.slice(0, 10);
  if (day < startDay || day > endDay) return null;
  const startMin = day === startDay ? minutesOf(start) : 0;
  const rawEnd = day === endDay ? minutesOf(end) : DAY_MIN;
  // Um fim exatamente à meia-noite do dia seguinte não gera um pedaço vazio nesse dia.
  if (day === endDay && rawEnd === 0 && startDay !== endDay) return null;
  const realMin = Math.max(0, rawEnd - startMin);
  const from = Math.min(startMin, DAY_MIN - MIN_VISUAL_MIN);
  return {
    id,
    startMin: from,
    endMin: Math.min(DAY_MIN, from + Math.max(realMin, MIN_VISUAL_MIN)),
    realMin,
  };
}

/** Segmentos dos eventos que tocam `day`. */
export function eventSegments(events: readonly StudyEvent[], day: string): Segment[] {
  return events.flatMap((e) => {
    const segment = segmentOnDay(e.id, e.start, e.end, day);
    return segment ? [segment] : [];
  });
}

export interface HourRange {
  /** Primeira hora exibida (0–23). */
  startHour: number;
  /** Hora final exclusiva (1–24). */
  endHour: number;
}

/**
 * Intervalo da grade: 06h–24h por padrão, **expandido** (em horas cheias) se algum segmento começa
 * antes ou termina depois dele.
 */
export function hourRange(segments: readonly Segment[]): HourRange {
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;
  for (const s of segments) {
    startHour = Math.min(startHour, Math.floor(s.startMin / 60));
    endHour = Math.max(endHour, Math.ceil(s.endMin / 60));
  }
  return { startHour: Math.max(0, startHour), endHour: Math.min(24, endHour) };
}

/** Une os intervalos de vários dias (a semana usa o mesmo intervalo em todas as colunas). */
export const mergeRanges = (ranges: readonly HourRange[]): HourRange => ({
  startHour: Math.min(DEFAULT_START_HOUR, ...ranges.map((r) => r.startHour)),
  endHour: Math.max(DEFAULT_END_HOUR, ...ranges.map((r) => r.endHour)),
});

/** Posição vertical em **porcentagem** do intervalo de horas (topo e altura). */
export function positionPct(
  segment: Pick<Segment, 'startMin' | 'endMin'>,
  range: HourRange,
): { top: number; height: number } {
  const total = (range.endHour - range.startHour) * 60;
  const from = range.startHour * 60;
  return {
    top: ((segment.startMin - from) / total) * 100,
    height: ((segment.endMin - segment.startMin) / total) * 100,
  };
}

/** Linha de “agora” em % do intervalo (ou `null` se fora dele). */
export function nowPct(nowMin: number, range: HourRange): number | null {
  const pct = ((nowMin - range.startHour * 60) / ((range.endHour - range.startHour) * 60)) * 100;
  return pct >= 0 && pct <= 100 ? pct : null;
}

export interface Placed extends Segment {
  /** Coluna (0, 1, …) dentro do grupo de itens concorrentes. */
  column: number;
  /** Quantas colunas o grupo tem (largura de cada bloco = 1 / columns). */
  columns: number;
}

/**
 * Distribui itens concorrentes em colunas lado a lado, sem sobreposição e sem perder nenhum.
 * Itens que se encadeiam por sobreposição formam um grupo e dividem o mesmo número de colunas;
 * um grupo novo recomeça em coluna única. Mesmo início: o mais longo primeiro. Usa o intervalo
 * visual (`startMin`–`endMin`, já com o mínimo aplicado).
 */
export function layoutSobreposicoes(segments: readonly Segment[]): Placed[] {
  const sorted = [...segments].sort(
    (a, b) => a.startMin - b.startMin || b.endMin - a.endMin || a.id.localeCompare(b.id),
  );
  const placed: Placed[] = [];
  let group: Placed[] = [];
  let groupEnd = -1;

  const flush = () => {
    const columns = Math.max(1, ...group.map((p) => p.column + 1));
    for (const p of group) placed.push({ ...p, columns });
    group = [];
  };

  for (const segment of sorted) {
    if (group.length > 0 && segment.startMin >= groupEnd) flush();
    // Primeira coluna livre: onde o último item termina antes de este começar.
    const taken = new Set(group.filter((p) => p.endMin > segment.startMin).map((p) => p.column));
    let column = 0;
    while (taken.has(column)) column += 1;
    group.push({ ...segment, column, columns: 1 });
    groupEnd = Math.max(groupEnd, segment.endMin);
  }
  flush();
  return placed;
}

/** Linhas de texto que cabem no bloco: 3 (tipo, título, horário), 2 (título e horário) ou 1 (título). */
export function blockLines(segment: Pick<Placed, 'startMin' | 'endMin' | 'columns'>): 1 | 2 | 3 {
  const minutes = segment.endMin - segment.startMin;
  const lines = minutes >= THREE_LINES_MIN ? 3 : 2;
  // Colunas muito estreitas (3 ou mais lado a lado) perdem uma linha.
  return (segment.columns >= 3 ? Math.max(1, lines - 1) : lines) as 1 | 2 | 3;
}

/** Duração (min) a partir da qual o bloco mostra 3 linhas; calibrada para `--ds-hour-h` = 4,5 rem. */
export const THREE_LINES_MIN = 50;

/** Arredonda um horário para o múltiplo de 30 min mais próximo abaixo (ex.: 14:47 → 14:30). */
export function roundDownTo30(minutes: number): number {
  return Math.floor(minutes / 30) * 30;
}

/** `HH:mm` a partir de minutos desde 00:00. */
export const formatMinutes = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
