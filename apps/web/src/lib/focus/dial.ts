import { FOCUS_MAX_MINUTES, FOCUS_MIN_MINUTES } from '@daily/shared';
import { clampMinutes } from './session';

export interface Point {
  x: number;
  y: number;
}

/** Ângulo (graus, 0 = topo, sentido horário) que representa `minutes` no anel (180 min = volta inteira). */
export const angleForMinutes = (minutes: number): number => (minutes / FOCUS_MAX_MINUTES) * 360;

/**
 * Minutos escolhidos ao arrastar o anel: converte a posição do ponteiro (relativa ao centro)
 * em minutos. `previous` evita o salto 180 ↔ 1 ao cruzar o topo: o valor “gruda” na ponta.
 */
export function minutesFromPointer(center: Point, pointer: Point, previous: number): number {
  const dx = pointer.x - center.x;
  const dy = pointer.y - center.y;
  const turn = (Math.atan2(dx, -dy) + 2 * Math.PI) % (2 * Math.PI); // 0..2π, 0 no topo
  const raw = (turn / (2 * Math.PI)) * FOCUS_MAX_MINUTES;
  if (Math.abs(raw - previous) > FOCUS_MAX_MINUTES / 2) {
    return previous > FOCUS_MAX_MINUTES / 2 ? FOCUS_MAX_MINUTES : FOCUS_MIN_MINUTES;
  }
  return clampMinutes(raw);
}

/** Teclado no anel: ←/↓ −1, →/↑ +1, PageDown/PageUp −5/+5, Home/End nas pontas. `null` = tecla ignorada. */
export function minutesFromKey(key: string, current: number): number | null {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return clampMinutes(current + 1);
    case 'ArrowLeft':
    case 'ArrowDown':
      return clampMinutes(current - 1);
    case 'PageUp':
      return clampMinutes(current + 5);
    case 'PageDown':
      return clampMinutes(current - 5);
    case 'Home':
      return FOCUS_MIN_MINUTES;
    case 'End':
      return FOCUS_MAX_MINUTES;
    default:
      return null;
  }
}
