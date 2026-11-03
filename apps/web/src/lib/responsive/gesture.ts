/**
 * Lógica pura dos gestos de arrastar (testada em `gesture.test.ts`). Os componentes só leem os
 * eventos de ponteiro e chamam estas funções.
 */

/** Distância mínima (px) para um deslize horizontal contar como troca de período. */
export const SWIPE_MIN_DISTANCE_PX = 56;
/** Velocidade mínima (px/ms) que dispensa a distância mínima, com um deslocamento curto. */
export const SWIPE_MIN_VELOCITY = 0.5;
/** Deslocamento mínimo (px) para a velocidade valer. */
export const SWIPE_FLICK_MIN_DISTANCE_PX = 24;
/** Quanto a direção precisa dominar o eixo vertical (evita conflitar com a rolagem). */
export const SWIPE_DOMINANCE = 1.6;
/** Duração máxima (ms) de um deslize; mais longo que isso é segurar, não deslizar. */
export const SWIPE_MAX_MS = 600;
/** Distância (px) em que o gesto ainda pode virar rolagem e não deve ser tratado. */
export const GESTURE_SLOP_PX = 10;

export type SwipeDirection = 'left' | 'right' | null;

interface Delta {
  dx: number;
  dy: number;
  /** Duração do gesto em ms. */
  dtMs: number;
}

/**
 * Deslize horizontal: o dedo foi mais para os lados que para cima/baixo e passou da distância (ou
 * foi um "flick" rápido). `left` = dedo para a esquerda (avança), `right` = para a direita (volta).
 */
export function swipeDirection({ dx, dy, dtMs }: Delta): SwipeDirection {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (dtMs > SWIPE_MAX_MS) return null;
  if (ax < SWIPE_FLICK_MIN_DISTANCE_PX) return null;
  if (ax < ay * SWIPE_DOMINANCE) return null;
  const velocity = ax / Math.max(dtMs, 1);
  if (ax < SWIPE_MIN_DISTANCE_PX && velocity < SWIPE_MIN_VELOCITY) return null;
  return dx < 0 ? 'left' : 'right';
}

/** O gesto já se decidiu pelo eixo horizontal (a partir daí a página não deve rolar na vertical)? */
export function isHorizontalIntent(dx: number, dy: number): boolean {
  const ax = Math.abs(dx);
  return ax > GESTURE_SLOP_PX && ax > Math.abs(dy) * SWIPE_DOMINANCE;
}

/** Distância (px) de arrasto para baixo que fecha um sheet. */
export const SHEET_CLOSE_DISTANCE_PX = 96;
/** Velocidade (px/ms) de arrasto para baixo que fecha um sheet mesmo com pouca distância. */
export const SHEET_CLOSE_VELOCITY = 0.6;

/** Arrastar a alça do sheet para baixo o fecha (distância ou velocidade); para cima não faz nada. */
export function shouldCloseSheet({ dy, dtMs }: Pick<Delta, 'dy' | 'dtMs'>): boolean {
  if (dy <= 0) return false;
  return (
    dy >= SHEET_CLOSE_DISTANCE_PX ||
    (dy > GESTURE_SLOP_PX * 2 && dy / Math.max(dtMs, 1) >= SHEET_CLOSE_VELOCITY)
  );
}

/** Tempo (ms) que o dedo precisa ficar parado para um toque longo. */
export const LONG_PRESS_MS = 450;
/** Quanto o dedo pode se mexer (px) antes de o toque longo ser cancelado (era rolagem). */
export const LONG_PRESS_MOVE_PX = 8;

/** O dedo se mexeu demais para ainda ser um toque longo? */
export const exceedsLongPressMove = (dx: number, dy: number): boolean =>
  Math.hypot(dx, dy) > LONG_PRESS_MOVE_PX;
