import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * `mm:ss`, ou `h:mm:ss` a partir de 1 h. Por padrão arredonda para cima (24:59,2 → 25:00);
 * com `round: 'down'` trunca (24:59,2 → 24:59), que combina com a fração dos milésimos.
 */
export function formatClock(ms: number, round: 'up' | 'down' = 'up'): string {
  const whole = round === 'up' ? Math.ceil(ms / 1000) : Math.floor(ms / 1000);
  const total = Math.max(0, whole);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** Milésimos do segundo corrente (“.290”), para exibir ao lado dos dígitos truncados. */
export function formatFraction(ms: number): string {
  const part = Math.max(0, Math.floor(ms)) % 1000;
  return `.${String(part).padStart(3, '0')}`;
}

/** Total de um dia no painel “Dias de mais foco”: “45 min”, “2h”, “2h15”. */
export function formatDayTotal(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${pad(m)}`;
}

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;

/** Data curta do painel: “ter., 21 out.”. */
export function formatShortDay(day: string): string {
  const date = parseISO(day);
  return `${WEEKDAYS[date.getDay()]}., ${format(date, 'd MMM', { locale: ptBR })}.`;
}

/** “1 sessão” / “3 sessões”. */
export const formatSessionCount = (n: number): string => `${n} ${n === 1 ? 'sessão' : 'sessões'}`;

/** Resumo curto: “25 min”, “1 h 05 min”, “40 s” (sessões abaixo de 1 min). */
export function formatFocused(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${pad(m)} min` : `${m} min`;
}

export const BASE_TITLE = 'Daily — organizador de estudos';

/** Título da aba durante a sessão: “12:34 · Daily”. */
export const sessionTitle = (remainingMs: number): string => `${formatClock(remainingMs)} · Daily`;
