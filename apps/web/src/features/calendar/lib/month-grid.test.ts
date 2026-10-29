import { describe, expect, it } from 'vitest';
import { buildMonthGrid } from './month-grid';

const grid = (year: number, monthIndex: number) => buildMonthGrid(new Date(year, monthIndex, 15));

describe('buildMonthGrid', () => {
  it('sempre devolve semanas completas de 7 dias, começando no domingo', () => {
    for (const month of [0, 1, 7, 9]) {
      const weeks = grid(2026, month);
      expect(weeks.every((w) => w.length === 7)).toBe(true);
      expect(weeks.every((w) => w[0]?.date.getDay() === 0)).toBe(true);
    }
  });

  it('fevereiro começando no domingo (28 dias) ocupa exatamente 4 semanas, sem dias de fora', () => {
    const weeks = grid(2026, 1);
    expect(weeks).toHaveLength(4);
    expect(weeks.flat().every((d) => d.inMonth)).toBe(true);
  });

  it('outubro começando na quinta ocupa 5 semanas e abre com dias de setembro', () => {
    const weeks = grid(2026, 9);
    expect(weeks).toHaveLength(5);
    expect(weeks[0]?.map((d) => d.inMonth)).toEqual([false, false, false, false, true, true, true]);
    expect(weeks[0]?.[4]?.key).toBe('2026-10-01');
  });

  it('agosto começando no sábado (31 dias) precisa de 6 semanas', () => {
    const weeks = grid(2026, 7);
    expect(weeks).toHaveLength(6);
    expect(weeks[0]?.[6]?.key).toBe('2026-08-01');
    expect(weeks[5]?.[0]?.key).toBe('2026-08-30');
  });

  it('marca como fora do mês apenas os dias vizinhos', () => {
    const days = grid(2026, 9).flat();
    expect(days.filter((d) => d.inMonth)).toHaveLength(31);
  });
});
