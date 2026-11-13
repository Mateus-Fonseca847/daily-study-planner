import { describe, expect, it } from 'vitest';
import { subtaskProgress } from './progress';

describe('subtaskProgress', () => {
  it('retorna zero sem subtarefas (sem divisão por zero)', () => {
    expect(subtaskProgress([])).toEqual({ done: 0, total: 0, ratio: 0 });
  });

  it('conta apenas subtarefas concluídos', () => {
    const p = subtaskProgress([{ done: true }, { done: false }, { done: true }, { done: false }]);
    expect(p).toEqual({ done: 2, total: 4, ratio: 0.5 });
  });

  it('chega a 100% quando tudo está concluído', () => {
    expect(subtaskProgress([{ done: true }, { done: true }]).ratio).toBe(1);
  });
});
