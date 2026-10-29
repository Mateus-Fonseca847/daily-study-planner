const pad = (n: number): string => String(n).padStart(2, '0');

const LITERS = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

/** Litros em pt-BR, sem zeros sobrando: 700 → “0,7 L”, 2000 → “2 L”, 1250 → “1,25 L”. */
export const formatLiters = (ml: number): string => `${LITERS.format(ml / 1000)} L`;

/** Horas a partir de minutos: 0 → “0h”, 45 → “45min”, 480 → “8h”, 510 → “8h30”, 65 → “1h05”. */
export function formatHours(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total === 0) return '0h';
  if (total < 60) return `${total}min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h${pad(m)}`;
}

/** Percentual inteiro (0–100 para progresso; sem limitar quando `cap` é falso). */
export const percentOf = (value: number, total: number, cap = true): number => {
  if (total <= 0) return 0;
  const percent = Math.round((value / total) * 100);
  return cap ? Math.min(100, percent) : percent;
};

export const formatDays = (n: number): string => `${n} ${n === 1 ? 'dia' : 'dias'}`;

/** “+20 %”, “−10 %”, “sem mudança”; `null` quando o período anterior era zero. */
export function formatVariation(percent: number | null): string {
  if (percent === null) return 'sem período anterior';
  if (percent === 0) return 'sem mudança';
  return `${percent > 0 ? '+' : '−'}${Math.abs(percent)} % vs. período anterior`;
}
