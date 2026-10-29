import { describe, expect, it } from 'vitest';
import { examProgress } from './progress';

describe('examProgress', () => {
  it('retorna zero sem conteúdos (sem divisão por zero)', () => {
    expect(examProgress([])).toEqual({ done: 0, total: 0, ratio: 0 });
  });

  it('conta apenas conteúdos concluídos', () => {
    const p = examProgress([{ done: true }, { done: false }, { done: true }, { done: false }]);
    expect(p).toEqual({ done: 2, total: 4, ratio: 0.5 });
  });

  it('chega a 100% quando tudo está concluído', () => {
    expect(examProgress([{ done: true }, { done: true }]).ratio).toBe(1);
  });
});
