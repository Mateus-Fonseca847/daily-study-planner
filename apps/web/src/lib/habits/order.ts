import type { Habit } from '@daily/shared';

type Ordered = Pick<Habit, 'id' | 'order' | 'archivedAt'>;

/** Hábitos na ordem de exibição (`order` crescente; empate: ordem original). Fonte única das telas. */
export function sortHabits<T extends Pick<Habit, 'order'>>(habits: readonly T[]): T[] {
  return habits
    .map((habit, index) => ({ habit, index }))
    .sort((a, b) => a.habit.order - b.habit.order || a.index - b.index)
    .map(({ habit }) => habit);
}

/** Move o item de `from` para `to` (índices de um array). Devolve uma cópia. */
export function arrayMove<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if (from === to || from < 0 || from >= next.length) return next;
  const target = Math.max(0, Math.min(next.length - 1, to));
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item as T);
  return next;
}

/**
 * Nova ordem de **todos** os ids depois de mover um hábito ativo para a posição `toActiveIndex`
 * (contada só entre os ativos). Arquivados não se movem: ficam nos mesmos lugares absolutos, e os
 * ativos preenchem as demais posições. Devolve `null` se nada muda ou o id não é de um ativo.
 */
export function moveActiveHabit(
  habits: readonly Ordered[],
  id: string,
  toActiveIndex: number,
): string[] | null {
  const all = sortHabits(habits);
  const active = all.filter((h) => h.archivedAt === null).map((h) => h.id);
  const from = active.indexOf(id);
  if (from === -1) return null;
  const to = Math.max(0, Math.min(active.length - 1, toActiveIndex));
  if (from === to) return null;
  const reordered = arrayMove(active, from, to);
  let cursor = 0;
  return all.map((h) => (h.archivedAt === null ? (reordered[cursor++] as string) : h.id));
}

/** Move um hábito ativo uma posição para cima (`-1`) ou para baixo (`1`). */
export function stepActiveHabit(
  habits: readonly Ordered[],
  id: string,
  direction: -1 | 1,
): string[] | null {
  const active = sortHabits(habits).filter((h) => h.archivedAt === null);
  const from = active.findIndex((h) => h.id === id);
  if (from === -1) return null;
  return moveActiveHabit(habits, id, from + direction);
}

/** Posição (1 a n) de um hábito entre os ativos, ou `null` se arquivado/inexistente. */
export function activePosition(habits: readonly Ordered[], id: string): number | null {
  const active = sortHabits(habits).filter((h) => h.archivedAt === null);
  const index = active.findIndex((h) => h.id === id);
  return index === -1 ? null : index + 1;
}
