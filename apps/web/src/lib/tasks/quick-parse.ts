import type { Recurrence } from '@daily/shared';
import { dayKey, shiftDay } from '../dates';
import { describeRule } from '../recurrence/describe';
import { weekdayOf } from '../recurrence/engine';

/** O que a entrada rápida entendeu. O que não entendeu fica no título, sem erro. */
export interface QuickEntry {
  title: string;
  /** Dia (`aaaa-mm-dd`); ausente = hoje. */
  date?: string;
  /** Hora (`HH:mm`); ausente = 23:59 (prazo do dia). */
  time?: string;
  recurrence?: Recurrence;
  /** Pedaços entendidos, para mostrar antes de salvar (“amanhã · 19:00 · Toda segunda”). */
  understood: string[];
}

/** Troca acentos por letras simples, um caractere por um (as posições continuam as mesmas). */
const FOLD: Record<string, string> = {
  á: 'a',
  à: 'a',
  â: 'a',
  ã: 'a',
  é: 'e',
  ê: 'e',
  í: 'i',
  ó: 'o',
  ô: 'o',
  õ: 'o',
  ú: 'u',
  ü: 'u',
  ç: 'c',
};
const fold = (text: string) =>
  text
    .toLowerCase()
    .split('')
    .map((c) => FOLD[c] ?? c)
    .join('');

const DAYS: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};
const DAY_RE = '(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira)?';
const UNITS: Record<string, Recurrence['freq']> = {
  dia: 'diaria',
  dias: 'diaria',
  semana: 'semanal',
  semanas: 'semanal',
  mes: 'mensal',
  meses: 'mensal',
  ano: 'anual',
  anos: 'anual',
};

/** O próximo dia (a partir de hoje, inclusive) que cai num destes dias da semana. */
const nextWeekday = (today: string, days: readonly number[]): string => {
  for (let i = 0; i < 7; i += 1) {
    const d = shiftDay(today, i);
    if (days.includes(weekdayOf(d))) return d;
  }
  return today;
};

/**
 * Entende expressões simples em pt-BR no texto de uma tarefa: `hoje`, `amanhã`, `segunda`,
 * `19h`, `19:30`, `todo dia`, `dias úteis`, `toda segunda`, `toda segunda e quarta`,
 * `a cada 2 dias`, `todo dia 5`, `toda semana`, `todo mês`, `todo ano`, `por 10 vezes`,
 * `até 20/12`. Função pura: “agora” é injetado.
 */
export function parseQuickEntry(text: string, now: Date): QuickEntry {
  const source = text;
  const low = fold(text);
  const cut: [number, number][] = [];
  /** Casa a expressão e a tira do título, só se `accept` aprovar o valor (senão fica no título). */
  const take = (
    re: RegExp,
    accept: (m: RegExpExecArray) => boolean = () => true,
  ): RegExpExecArray | null => {
    const m = re.exec(low);
    if (!m || !accept(m)) return null;
    const start = m.index;
    const end = start + m[0].length;
    if (cut.some(([a, b]) => start < b && end > a)) return null;
    cut.push([start, end]);
    return m;
  };
  const today = dayKey(now);
  const understood: string[] = [];
  let date: string | undefined;
  let time: string | undefined;
  let rule: Omit<Recurrence, 'end'> | undefined;
  let end: Recurrence['end'] = { kind: 'nunca' };

  // Repetição (das formas mais específicas para as mais gerais).
  const inRange = (value: string | undefined, min: number, max: number) =>
    Number(value) >= min && Number(value) <= max;
  let m = take(/\btodo dia (\d{1,2})\b/, (x) => inRange(x[1], 1, 31));
  if (m) rule = { freq: 'mensal', interval: 1, monthDay: Number(m[1]) };
  if (
    !rule &&
    (m = take(/\ba cada (\d{1,2}) (dias?|semanas?|mes|meses|anos?)\b/, (x) => inRange(x[1], 1, 99)))
  ) {
    rule = { freq: UNITS[m[2]!]!, interval: Number(m[1]) };
  }
  if (!rule && take(/\b(dias? uteis|de segunda a sexta)\b/)) {
    rule = { freq: 'semanal', interval: 1, weekdays: [1, 2, 3, 4, 5] };
  }
  if (
    !rule &&
    (m = take(
      new RegExp(`\\b(?:toda|todo|todas as|todos os) ${DAY_RE}s?((?:\\s*(?:,|e)\\s*${DAY_RE}s?)*)`),
    ))
  ) {
    const names = m[0].match(new RegExp(DAY_RE, 'g')) ?? [];
    const days = [...new Set(names.map((n) => DAYS[n.replace('-feira', '')]!))].sort(
      (a, b) => a - b,
    );
    rule = { freq: 'semanal', interval: 1, weekdays: days };
  }
  // “todo dia 40” não é “todo dia” (o número inválido fica no título junto).
  if (!rule && take(/\b(todo dia|todos os dias|diariamente)\b(?!\s*\d)/))
    rule = { freq: 'diaria', interval: 1 };
  if (!rule && take(/\b(toda semana|semanalmente)\b/)) rule = { freq: 'semanal', interval: 1 };
  if (!rule && take(/\b(todo mes|mensalmente)\b/)) rule = { freq: 'mensal', interval: 1 };
  if (!rule && take(/\b(todo ano|anualmente)\b/)) rule = { freq: 'anual', interval: 1 };

  // Término (só faz sentido com repetição).
  if (rule && (m = take(/\bpor (\d{1,3}) vez(?:es)?\b/, (x) => inRange(x[1], 1, 999)))) {
    end = { kind: 'apos', count: Number(m[1]) };
  }
  if (
    rule &&
    (m = take(
      /\bate (\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/,
      (x) => inRange(x[1], 1, 31) && inRange(x[2], 1, 12),
    ))
  ) {
    const [d, mo] = [Number(m[1]), Number(m[2])];
    let year = m[3] ? Number(m[3]) : Number(today.slice(0, 4));
    const key = (y: number) => `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (!m[3] && key(year) < today) year += 1;
    end = { kind: 'em', date: key(year) };
  }

  // Dia.
  if (take(/\bhoje\b/)) date = today;
  else if (take(/\bamanha\b/)) date = shiftDay(today, 1);
  else if ((m = take(new RegExp(`\\b(?:na |no |nesta |neste |proxima |proximo )?${DAY_RE}\\b`)))) {
    const day = DAYS[m[1]!]!;
    date = nextWeekday(today, [day]);
  }

  // Hora: 19h, 19h30, 19:30 (com “às” opcional).
  if (
    (m = take(
      /\b(?:as |a )?(\d{1,2})(?:h(\d{2})?|:(\d{2}))(?=\s|$|[,.])/,
      (x) => inRange(x[1], 0, 23) && inRange(x[2] ?? x[3] ?? '0', 0, 59),
    ))
  ) {
    time = `${m[1]!.padStart(2, '0')}:${(m[2] ?? m[3] ?? '00').padStart(2, '0')}`;
  }

  // A data inicial de uma série semanal/mensal sem dia explícito é a próxima ocorrência.
  if (rule && !date) {
    if (rule.freq === 'semanal' && rule.weekdays) date = nextWeekday(today, rule.weekdays);
    else if (rule.freq === 'mensal' && typeof rule.monthDay === 'number') {
      const day = rule.monthDay;
      let d = today;
      for (let i = 0; i < 62 && Number(d.slice(8, 10)) !== day; i += 1) d = shiftDay(d, 1);
      date = d;
    }
  }

  const recurrence: Recurrence | undefined = rule ? { ...rule, end } : undefined;
  const removed = [...cut].sort((a, b) => b[0] - a[0]);
  let title = source;
  for (const [a, b] of removed) title = title.slice(0, a) + ' ' + title.slice(b);
  title = title
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;])/g, '$1')
    .replace(/^[\s,.;-]+|[\s,.;-]+$/g, '')
    .trim();

  if (date === today) understood.push('hoje');
  else if (date === shiftDay(today, 1)) understood.push('amanhã');
  else if (date) understood.push(`${date.slice(8, 10)}/${date.slice(5, 7)}`);
  if (time) understood.push(time);
  if (recurrence) understood.push(describeRule(recurrence, date ?? today));

  return {
    title: title || source.trim(),
    ...(date ? { date } : {}),
    ...(time ? { time } : {}),
    ...(recurrence ? { recurrence } : {}),
    understood,
  };
}
