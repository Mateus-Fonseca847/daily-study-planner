import { describe, expect, it } from 'vitest';
import { activePosition, arrayMove, moveActiveHabit, sortHabits, stepActiveHabit } from './order';

const h = (id: string, order: number, archived = false) => ({
  id,
  order,
  archivedAt: archived ? '2026-01-01T00:00:00' : null,
});

describe('sortHabits', () => {
  it('ordena por order e mantém a ordem original nos empates', () => {
    const list = [h('c', 2), h('a', 0), h('b', 0)];
    expect(sortHabits(list).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('arrayMove', () => {
  it('move para frente e para trás sem mudar o original', () => {
    const base = ['a', 'b', 'c', 'd'];
    expect(arrayMove(base, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(arrayMove(base, 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(arrayMove(base, 1, 1)).toEqual(base);
    expect(base).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('moveActiveHabit', () => {
  const three = [h('a', 0), h('b', 1), h('c', 2)];

  it('move em todas as direções', () => {
    expect(moveActiveHabit(three, 'a', 2)).toEqual(['b', 'c', 'a']);
    expect(moveActiveHabit(three, 'c', 0)).toEqual(['c', 'a', 'b']);
    expect(moveActiveHabit(three, 'b', 0)).toEqual(['b', 'a', 'c']);
    expect(moveActiveHabit(three, 'b', 2)).toEqual(['a', 'c', 'b']);
  });

  it('limita o destino e ignora quando nada muda', () => {
    expect(moveActiveHabit(three, 'a', 99)).toEqual(['b', 'c', 'a']);
    expect(moveActiveHabit(three, 'a', -5)).toBeNull();
    expect(moveActiveHabit(three, 'b', 1)).toBeNull();
  });

  it('ids desconhecidos ou arquivados não se movem', () => {
    expect(moveActiveHabit(three, 'zzz', 0)).toBeNull();
    expect(moveActiveHabit([h('a', 0), h('x', 1, true)], 'x', 0)).toBeNull();
  });

  it('arquivados ficam nos mesmos lugares absolutos', () => {
    const list = [h('a', 0), h('x', 1, true), h('b', 2), h('c', 3)];
    // ativos: a, b, c → c, a, b; o arquivado continua na posição 1.
    expect(moveActiveHabit(list, 'c', 0)).toEqual(['c', 'x', 'a', 'b']);
  });

  it('parte da ordem já normalizada mesmo com lacunas em order', () => {
    const gaps = [h('a', 5), h('b', 9), h('c', 20)];
    expect(moveActiveHabit(gaps, 'c', 0)).toEqual(['c', 'a', 'b']);
  });
});

describe('stepActiveHabit', () => {
  const list = [h('a', 0), h('x', 1, true), h('b', 2), h('c', 3)];

  it('sobe e desce uma posição entre os ativos', () => {
    expect(stepActiveHabit(list, 'b', -1)).toEqual(['b', 'x', 'a', 'c']);
    expect(stepActiveHabit(list, 'b', 1)).toEqual(['a', 'x', 'c', 'b']);
  });

  it('nas pontas não faz nada', () => {
    expect(stepActiveHabit(list, 'a', -1)).toBeNull();
    expect(stepActiveHabit(list, 'c', 1)).toBeNull();
  });
});

describe('activePosition', () => {
  it('conta só os ativos', () => {
    const list = [h('a', 0), h('x', 1, true), h('b', 2)];
    expect(activePosition(list, 'a')).toBe(1);
    expect(activePosition(list, 'b')).toBe(2);
    expect(activePosition(list, 'x')).toBeNull();
  });
});
