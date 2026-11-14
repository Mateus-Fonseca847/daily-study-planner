import { describe, expect, it } from 'vitest';
import { blockChipSize, completeControl, statusSuffix } from './complete-control';

describe('completeControl', () => {
  it('tarefa e especial pendentes alternam, com a visibilidade do tamanho', () => {
    expect(completeControl({ type: 'tarefa', status: 'pendente' }, 'list')).toEqual({
      kind: 'toggle',
      visibility: 'always',
    });
    expect(completeControl({ type: 'especial', status: 'concluido' }, 'block')).toEqual({
      kind: 'toggle',
      visibility: 'pointer',
    });
    expect(completeControl({ type: 'tarefa', status: 'pendente' }, 'compact')).toEqual({
      kind: 'toggle',
      visibility: 'reveal',
    });
  });

  it('prova nunca ganha o controle, em nenhum tamanho', () => {
    for (const size of ['list', 'block', 'compact', 'tiny'] as const) {
      expect(completeControl({ type: 'prova', status: 'pendente' }, size).kind).toBe('none');
    }
  });

  it('cancelada só mostra o estado onde há folga', () => {
    expect(completeControl({ type: 'tarefa', status: 'cancelado' }, 'list').kind).toBe('cancelled');
    expect(completeControl({ type: 'tarefa', status: 'cancelado' }, 'block').kind).toBe(
      'cancelled',
    );
    expect(completeControl({ type: 'tarefa', status: 'cancelado' }, 'compact').kind).toBe('none');
  });

  it('bloco reduzido à faixa não tem controle', () => {
    expect(completeControl({ type: 'tarefa', status: 'pendente' }, 'tiny')).toEqual({
      kind: 'none',
      visibility: 'none',
    });
  });
});

describe('blockChipSize', () => {
  it('2 ou 3 linhas na coluna inteira = block; 1 linha ou coluna dividida = compact', () => {
    expect(blockChipSize(3, 1, false)).toBe('block');
    expect(blockChipSize(2, 1, false)).toBe('block');
    expect(blockChipSize(1, 1, false)).toBe('compact');
    expect(blockChipSize(3, 2, false)).toBe('compact');
    expect(blockChipSize(3, 2, true)).toBe('tiny');
  });
});

describe('statusSuffix', () => {
  it('anuncia concluída e cancelada; pendente fica sem sufixo', () => {
    expect(statusSuffix('concluido')).toBe(', concluída');
    expect(statusSuffix('cancelado')).toBe(', cancelada');
    expect(statusSuffix('pendente')).toBe('');
    expect(statusSuffix(undefined)).toBe('');
  });
});
