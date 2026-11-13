import type { Subtask } from './event';

export interface Progress {
  done: number;
  total: number;
  /** Fração entre 0 e 1; 0 quando não há subtarefas. */
  ratio: number;
}

/** Progresso calculado pelas subtarefas (ou conteúdos, numa prova). */
export function subtaskProgress(subtasks: readonly Pick<Subtask, 'done'>[]): Progress {
  const total = subtasks.length;
  const done = subtasks.filter((c) => c.done).length;
  return { done, total, ratio: total === 0 ? 0 : done / total };
}
