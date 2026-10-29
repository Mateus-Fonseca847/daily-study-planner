import { describe, expect, it } from 'vitest';
import type { StudyEvent } from '@daily/shared';
import { densidadePorDia, describeDensity, grade12Meses } from './year';

const ev = (id: string, day: string, type = 'estudo', status = 'pendente'): StudyEvent =>
  ({ id, type, status, start: `${day}T09:00:00`, end: `${day}T10:00:00`, title: id }) as StudyEvent;

describe('grade12Meses', () => {
  it('traz 12 meses com os dias reais, inclusive fevereiro de ano bissexto', () => {
    expect(grade12Meses(2026).map((m) => m.days.length)).toEqual([
      31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
    ]);
    expect(grade12Meses(2028)[1]?.days).toHaveLength(29);
    expect(grade12Meses(2028)[1]?.days.at(-1)).toBe('2028-02-29');
    expect(grade12Meses(1900)[1]?.days).toHaveLength(28); // século não bissexto
  });

  it('o deslocamento é o dia da semana do dia 1, para cada dia da semana', () => {
    expect(grade12Meses(2026).map((m) => m.offset)).toEqual([4, 0, 0, 3, 5, 1, 3, 6, 2, 4, 0, 2]);
    const offsets = new Set(
      Array.from({ length: 30 }, (_, i) => grade12Meses(2000 + i).map((m) => m.offset)).flat(),
    );
    expect([...offsets].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('as chaves de mês e dia são yyyy-MM e yyyy-MM-dd', () => {
    const jan = grade12Meses(2026)[0];
    expect(jan?.key).toBe('2026-01');
    expect(jan?.days[0]).toBe('2026-01-01');
  });
});

describe('densidadePorDia', () => {
  it('conta eventos e provas por dia e os níveis 0, 1, 2 e 3+', () => {
    const map = densidadePorDia(
      [
        ev('a', '2026-10-29'),
        ev('b', '2026-10-30'),
        ev('c', '2026-10-30', 'prova'),
        ev('d', '2026-10-31'),
        ev('e', '2026-10-31'),
        ev('f', '2026-10-31', 'prova'),
        ev('g', '2026-10-31', 'entrega'),
      ],
      2026,
    );
    expect(map.get('2026-10-29')).toEqual({ events: 1, exams: 0, level: 1 });
    expect(map.get('2026-10-30')).toEqual({ events: 2, exams: 1, level: 2 });
    expect(map.get('2026-10-31')).toEqual({ events: 4, exams: 1, level: 3 });
    expect(map.get('2026-10-28')).toBeUndefined();
  });

  it('ignora outros anos e cancelados; vale em 29/02 e na virada de ano', () => {
    const map = densidadePorDia(
      [
        ev('a', '2028-02-29'),
        ev('b', '2027-12-31'),
        ev('c', '2028-01-01'),
        ev('x', '2028-02-29', 'estudo', 'cancelado'),
      ],
      2028,
    );
    expect([...map.keys()].sort()).toEqual(['2028-01-01', '2028-02-29']);
    expect(map.get('2028-02-29')?.events).toBe(1);
  });

  it('descreve a contagem para tooltip e aria-label', () => {
    expect(describeDensity(undefined)).toBe('Nenhum evento');
    expect(describeDensity({ events: 3, exams: 1, level: 3 })).toBe('3 eventos, 1 prova');
    expect(describeDensity({ events: 1, exams: 0, level: 1 })).toBe('1 evento');
    expect(describeDensity({ events: 2, exams: 2, level: 2 })).toBe('2 eventos, 2 provas');
  });
});
