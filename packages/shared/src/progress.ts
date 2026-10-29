import type { ContentItem } from './event';

export interface Progress {
  done: number;
  total: number;
  /** Fração entre 0 e 1; 0 quando não há conteúdos. */
  ratio: number;
}

export function examProgress(contents: readonly Pick<ContentItem, 'done'>[]): Progress {
  const total = contents.length;
  const done = contents.filter((c) => c.done).length;
  return { done, total, ratio: total === 0 ? 0 : done / total };
}
