import { describe, expect, it } from 'vitest';
import { block } from '../data/test-utils';
import { AGENDA_HOURS, layoutAgenda, nowOffsetHours } from './agenda';

const DAY = '2026-11-10';
const at = (id: string, hour: number, minute = 0, extra: object = {}) => ({
  ...block(id),
  start: `${DAY}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
  end: `${DAY}T${String(hour + 1).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
  ...extra,
});

describe('agenda de hoje', () => {
  it('só os eventos do dia, não cancelados, ordenados por horário', () => {
    const items = layoutAgenda(
      [
        at('tarde', 15),
        at('cedo', 8),
        at('cancelado', 9, 0, { status: 'cancelado' }),
        { ...at('amanha', 9), start: '2026-11-11T09:00:00', end: '2026-11-11T10:00:00' },
      ],
      DAY,
    );
    expect(items.map((i) => i.event.id)).toEqual(['cedo', 'tarde']);
    expect(items.map((i) => i.offsetHours)).toEqual([2, 9]); // 08h = 2 h após as 06h
  });

  it('eventos às 10h e 11h se sobrepõem e são escalonados em colunas', () => {
    const items = layoutAgenda([at('dez', 10), at('onze', 11)], DAY);
    expect(items.map((i) => [i.event.id, i.column])).toEqual([
      ['dez', 0],
      ['onze', 1],
    ]);
  });

  it('eventos distantes ficam na mesma coluna; um terceiro reaproveita a coluna livre', () => {
    const items = layoutAgenda([at('a', 8), at('b', 8, 30), at('c', 10)], DAY);
    expect(items.map((i) => i.column)).toEqual([0, 1, 0]); // c começa 2 h depois de a
  });

  it('eventos fora da linha do tempo são encostados nas pontas', () => {
    const [early, late] = layoutAgenda([at('madrugada', 3), at('noite', 23, 45)], DAY);
    expect(early?.offsetHours).toBe(0);
    expect(late?.offsetHours).toBe(17.5);
  });

  it('sem eventos: lista vazia', () => {
    expect(layoutAgenda([], DAY)).toEqual([]);
  });

  it('linha de agora: dentro de 06h–24h, senão nula', () => {
    expect(nowOffsetHours(new Date(2026, 10, 10, 10, 30))).toBe(4.5);
    expect(nowOffsetHours(new Date(2026, 10, 10, 6, 0))).toBe(0);
    expect(nowOffsetHours(new Date(2026, 10, 10, 5, 59))).toBeNull();
    expect(nowOffsetHours(new Date(2026, 10, 10, 23, 59))).toBeCloseTo(17.98, 1);
  });

  it('rótulos de 06h a 23h', () => {
    expect(AGENDA_HOURS[0]).toBe(6);
    expect(AGENDA_HOURS.at(-1)).toBe(23);
    expect(AGENDA_HOURS).toHaveLength(18);
  });
});
