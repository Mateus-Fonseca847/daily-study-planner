const pad = (n: number): string => String(n).padStart(2, '0');

/** `mm:ss`, ou `h:mm:ss` a partir de 1 h. Arredonda para cima (24:59,2 → 25:00). */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

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
