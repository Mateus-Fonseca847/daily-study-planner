import { describe, expect, it } from 'vitest';
import {
  buildCalendarSearch,
  dayHeading,
  isValidDay,
  parseCalendarSearch,
  periodTitle,
  shiftPeriod,
  weekRange,
} from './views';

const TODAY = '2026-10-29'; // quinta-feira

describe('URL do calendário', () => {
  it('lê visão e data válidas', () => {
    expect(parseCalendarSearch('?visao=semana&data=2026-10-29', TODAY)).toEqual({
      view: 'semana',
      date: '2026-10-29',
    });
    expect(parseCalendarSearch('visao=ano&data=2027-01-05', TODAY)).toEqual({
      view: 'ano',
      date: '2027-01-05',
    });
  });

  it('valores ausentes ou inválidos caem em Mês + hoje, cada um por conta própria', () => {
    expect(parseCalendarSearch('', TODAY)).toEqual({ view: 'mes', date: TODAY });
    expect(parseCalendarSearch('visao=hora&data=ontem', TODAY)).toEqual({
      view: 'mes',
      date: TODAY,
    });
    expect(parseCalendarSearch('visao=dia&data=2026-02-30', TODAY)).toEqual({
      view: 'dia',
      date: TODAY,
    });
    expect(parseCalendarSearch('visao=ano&data=29-10-2026', TODAY)).toEqual({
      view: 'ano',
      date: TODAY,
    });
    expect(isValidDay('2028-02-29')).toBe(true);
    expect(isValidDay('2027-02-29')).toBe(false);
    expect(isValidDay(null)).toBe(false);
  });

  it('escreve e relê o mesmo estado', () => {
    const state = { view: 'semana' as const, date: '2026-10-29' };
    expect(buildCalendarSearch(state)).toBe('visao=semana&data=2026-10-29');
    expect(parseCalendarSearch(buildCalendarSearch(state), '2000-01-01')).toEqual(state);
  });
});

describe('períodos', () => {
  it('semana de domingo a sábado, com virada de mês e de ano', () => {
    expect(weekRange('2026-10-29')).toMatchObject({ start: '2026-10-25', end: '2026-10-31' });
    expect(weekRange('2026-10-25').start).toBe('2026-10-25'); // domingo
    expect(weekRange('2026-12-31')).toMatchObject({ start: '2026-12-27', end: '2027-01-02' });
    expect(weekRange('2026-12-31').days).toHaveLength(7);
    expect(weekRange('2028-02-27').end).toBe('2028-03-04'); // ano bissexto
  });

  it('as setas andam por dia, semana, mês e ano', () => {
    expect(shiftPeriod('dia', '2026-10-31', 1)).toBe('2026-11-01');
    expect(shiftPeriod('semana', '2026-12-30', 1)).toBe('2027-01-06');
    expect(shiftPeriod('semana', '2026-01-02', -1)).toBe('2025-12-26');
    expect(shiftPeriod('mes', '2026-01-31', 1)).toBe('2026-02-28');
    expect(shiftPeriod('mes', '2026-01-15', -1)).toBe('2025-12-15');
    expect(shiftPeriod('ano', '2028-02-29', 1)).toBe('2029-02-28');
  });

  it('títulos de cada visão', () => {
    expect(periodTitle('dia', TODAY)).toBe('Quinta-feira, 29 de out 2026');
    expect(periodTitle('semana', '2026-10-29')).toBe('25 – 31 out 2026');
    expect(periodTitle('semana', '2026-11-03')).toBe('1 – 7 nov 2026');
    expect(periodTitle('mes', TODAY)).toBe('Outubro 2026');
    expect(periodTitle('ano', TODAY)).toBe('2026');
  });

  it('semana que cruza mês ou ano ajusta o título', () => {
    expect(periodTitle('semana', '2026-09-30')).toBe('27 set – 3 out 2026');
    expect(periodTitle('semana', '2026-12-30')).toBe('27 dez 2026 – 2 jan 2027');
  });

  it('título da visão Dia: hoje ou data por extenso', () => {
    expect(dayHeading(TODAY, TODAY)).toBe('Hoje, quinta-feira, 29 de outubro');
    expect(dayHeading('2026-10-28', TODAY)).toBe('Quarta-feira, 28 de outubro de 2026');
  });
});
