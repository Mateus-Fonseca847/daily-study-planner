import type { Subtask } from '@daily/shared';

export type MoveDirection = 'up' | 'down';

/** Move uma subtarefa uma posição (botões “subir/descer”; sem arrastar nesta etapa). */
export function moveSubtask(
  subtasks: readonly Subtask[],
  id: string,
  direction: MoveDirection,
): Subtask[] {
  const sorted = [...subtasks].sort((a, b) => a.order - b.order);
  const index = sorted.findIndex((c) => c.id === id);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= sorted.length) {
    return sorted.map((c, order) => ({ ...c, order }));
  }
  [sorted[index], sorted[target]] = [sorted[target]!, sorted[index]!];
  return sorted.map((c, order) => ({ ...c, order }));
}
