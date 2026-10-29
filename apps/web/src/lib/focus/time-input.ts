import { FOCUS_MAX_SECONDS, FOCUS_MIN_SECONDS } from '@daily/shared';
import { SHIFT_STEP_MIN } from './constants';
import { formatClock } from './format';

export type DurationParse =
  { ok: true; seconds: number; clamped: 'min' | 'max' | null } | { ok: false };

/** Limita a duração a 1 min – 3 h (em segundos). */
export const clampSeconds = (seconds: number): number =>
  Math.min(FOCUS_MAX_SECONDS, Math.max(FOCUS_MIN_SECONDS, Math.round(seconds)));

/** Remove tudo que não seja dígito ou “:” (o campo só aceita isso). */
export const sanitizeDurationText = (text: string): string => text.replace(/[^0-9:]/g, '');

/**
 * Interpreta o que o usuário digitou:
 *  `25` = 25 min · `90` = 1 h 30 · `25:30` = 25 min 30 s · `1:30:00` = 1 h 30 min.
 * Formato inválido → `{ ok: false }`. Valores fora de 1 min – 3 h são ajustados ao limite (`clamped`).
 */
export function parseDuration(text: string): DurationParse {
  const value = text.trim();
  if (!/^\d{1,6}(:\d{1,2}){0,2}$/.test(value)) return { ok: false };

  const parts = value.split(':').map(Number);
  let seconds: number;
  if (parts.length === 1) {
    seconds = (parts[0] ?? 0) * 60;
  } else if (parts.length === 2) {
    const [minutes = 0, secs = 0] = parts;
    if (secs > 59) return { ok: false };
    seconds = minutes * 60 + secs;
  } else {
    const [hours = 0, minutes = 0, secs = 0] = parts;
    if (minutes > 59 || secs > 59) return { ok: false };
    seconds = hours * 3600 + minutes * 60 + secs;
  }

  if (seconds < FOCUS_MIN_SECONDS) return { ok: true, seconds: FOCUS_MIN_SECONDS, clamped: 'min' };
  if (seconds > FOCUS_MAX_SECONDS) return { ok: true, seconds: FOCUS_MAX_SECONDS, clamped: 'max' };
  return { ok: true, seconds, clamped: null };
}

/** Texto exibido no campo: `mm:ss` ou `h:mm:ss`. */
export const formatDuration = (seconds: number): string => formatClock(seconds * 1000);

/** Setas ↑/↓ no campo: ±1 min (Shift: ±5 min), sempre dentro dos limites. */
export function stepDuration(seconds: number, direction: 1 | -1, shift: boolean): number {
  return clampSeconds(seconds + direction * (shift ? SHIFT_STEP_MIN : 1) * 60);
}

/** Mensagem (aria-live) para uma entrada que foi ajustada ou recusada. */
export function durationNotice(result: DurationParse, previous: number): string | null {
  if (!result.ok) return `Duração inválida. Mantido ${formatDuration(previous)}.`;
  if (result.clamped === 'min') return 'Duração mínima: 1 minuto.';
  if (result.clamped === 'max') return 'Duração máxima: 3 horas.';
  return null;
}
