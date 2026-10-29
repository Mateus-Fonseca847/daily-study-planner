import { differenceInCalendarDays } from 'date-fns';

function formatClock(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return minutes === 0 ? `${hours}h` : `${hours}h${String(minutes).padStart(2, '0')}`;
}

/** Contagem regressiva em dias de calendário: “hoje às 14h”, “amanhã”, “em 3 dias”, “ontem”, “há 2 dias”. */
export function formatCountdown(target: Date, now: Date): string {
  const days = differenceInCalendarDays(target, now);
  if (days === 0) return `hoje às ${formatClock(target)}`;
  if (days === 1) return 'amanhã';
  if (days > 1) return `em ${days} dias`;
  if (days === -1) return 'ontem';
  return `há ${-days} dias`;
}
