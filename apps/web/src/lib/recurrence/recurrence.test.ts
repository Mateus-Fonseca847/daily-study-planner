import { afterEach, describe, expect, it, vi } from 'vitest';
import { recurrenceSchema, type Recurrence } from '@daily/shared';
import {
  describeRule,
  HORIZON_DAYS,
  MAX_OCCURRENCES_PER_WINDOW,
  nextOccurrences,
  occurrencesBetween,
  occursOnDay,
} from './index';

const rule = (r: Partial<Recurrence> & Pick<Recurrence, 'freq'>): Recurrence =>
  recurrenceSchema.parse({ interval: 1, ...r });
const dates = (r: Recurrence, anchor: string, from: string, to: string, today?: string) =>
  occurrencesBetween(r, anchor, { from, to }, today).map((o) => o.date);

describe('diária', () => {
  it('todo dia e a cada N dias, nunca antes da data inicial', () => {
    expect(dates(rule({ freq: 'diaria' }), '2026-11-10', '2026-11-08', '2026-11-12')).toEqual([
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
    ]);
    expect(
      dates(rule({ freq: 'diaria', interval: 3 }), '2026-11-10', '2026-11-11', '2026-11-20'),
    ).toEqual(['2026-11-13', '2026-11-16', '2026-11-19']);
  });

  it('janela que cruza mês e ano, e ano bissexto', () => {
    expect(dates(rule({ freq: 'diaria' }), '2026-12-30', '2026-12-30', '2027-01-02')).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ]);
    expect(dates(rule({ freq: 'diaria' }), '2028-02-27', '2028-02-27', '2028-03-01')).toEqual([
      '2028-02-27',
      '2028-02-28',
      '2028-02-29',
      '2028-03-01',
    ]);
  });

  it('horário de verão não desloca dias (datas locais, sem somar 24 h em ms)', () => {
    const tz = process.env.TZ;
    try {
      // Estados Unidos: o relógio adianta em 08/03/2026 e atrasa em 01/11/2026.
      process.env.TZ = 'America/New_York';
      expect(dates(rule({ freq: 'diaria' }), '2026-03-07', '2026-03-07', '2026-03-10')).toEqual([
        '2026-03-07',
        '2026-03-08',
        '2026-03-09',
        '2026-03-10',
      ]);
      expect(
        dates(rule({ freq: 'semanal', weekdays: [0] }), '2026-10-25', '2026-10-25', '2026-11-08'),
      ).toEqual(['2026-10-25', '2026-11-01', '2026-11-08']);
    } finally {
      process.env.TZ = tz;
    }
  });
});

describe('semanal', () => {
  it('vários dias da semana (segunda e quarta), começando na data inicial', () => {
    // 11/11/2026 é quarta: a segunda dessa semana (09) não existe.
    const r = rule({ freq: 'semanal', weekdays: [1, 3] });
    expect(dates(r, '2026-11-11', '2026-11-01', '2026-11-25')).toEqual([
      '2026-11-11',
      '2026-11-16',
      '2026-11-18',
      '2026-11-23',
      '2026-11-25',
    ]);
  });

  it('sem dias: o dia da semana da data inicial', () => {
    expect(dates(rule({ freq: 'semanal' }), '2026-11-12', '2026-11-12', '2026-11-26')).toEqual([
      '2026-11-12',
      '2026-11-19',
      '2026-11-26',
    ]);
  });

  it('a cada 2 semanas usa a semana da data inicial (semana começa no domingo)', () => {
    // Âncora num sábado (14/11): semana de 08 a 14. Ocorre nas semanas 08, 22/11, 06/12…
    const r = rule({ freq: 'semanal', interval: 2, weekdays: [0, 6] });
    expect(dates(r, '2026-11-14', '2026-11-01', '2026-12-13')).toEqual([
      '2026-11-14',
      '2026-11-22',
      '2026-11-28',
      '2026-12-06',
      '2026-12-12',
    ]);
  });

  it('janela no meio da série salta direto (o índice continua certo)', () => {
    const r = rule({ freq: 'semanal', weekdays: [1, 3], end: { kind: 'apos', count: 5 } });
    const all = occurrencesBetween(r, '2026-11-11', { from: '2026-11-01', to: '2027-01-31' });
    expect(all.map((o) => o.index)).toEqual([0, 1, 2, 3, 4]);
    const late = occurrencesBetween(r, '2026-11-11', { from: '2026-11-20', to: '2027-01-31' });
    expect(late).toEqual([
      { date: '2026-11-23', index: 3 },
      { date: '2026-11-25', index: 4 },
    ]);
  });
});

describe('mensal', () => {
  it('dia 31 cai no último dia dos meses menores (e volta a 31 nos maiores)', () => {
    expect(dates(rule({ freq: 'mensal' }), '2026-01-31', '2026-01-01', '2026-05-31')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
    ]);
  });

  it('dia 30 e 29 em fevereiro, comum e bissexto', () => {
    expect(dates(rule({ freq: 'mensal' }), '2027-01-30', '2027-02-01', '2027-03-31')).toEqual([
      '2027-02-28',
      '2027-03-30',
    ]);
    expect(dates(rule({ freq: 'mensal' }), '2028-01-29', '2028-02-01', '2028-02-29')).toEqual([
      '2028-02-29',
    ]);
    expect(dates(rule({ freq: 'mensal' }), '2027-01-29', '2027-02-01', '2027-02-28')).toEqual([
      '2027-02-28',
    ]);
  });

  it('“último dia” e dia escolhido antes da data inicial (começa no mês seguinte)', () => {
    expect(
      dates(rule({ freq: 'mensal', monthDay: 'ultimo' }), '2028-01-10', '2028-01-01', '2028-04-30'),
    ).toEqual(['2028-01-31', '2028-02-29', '2028-03-31', '2028-04-30']);
    const r = rule({ freq: 'mensal', monthDay: 5, end: { kind: 'apos', count: 2 } });
    expect(occurrencesBetween(r, '2026-11-10', { from: '2026-11-01', to: '2027-12-31' })).toEqual([
      { date: '2026-12-05', index: 0 },
      { date: '2027-01-05', index: 1 },
    ]);
  });

  it('a cada 3 meses, cruzando o ano', () => {
    expect(
      dates(rule({ freq: 'mensal', interval: 3 }), '2026-11-15', '2026-11-01', '2027-08-31'),
    ).toEqual(['2026-11-15', '2027-02-15', '2027-05-15', '2027-08-15']);
  });
});

describe('anual', () => {
  it('29/02 cai em 28/02 nos anos comuns', () => {
    expect(dates(rule({ freq: 'anual' }), '2028-02-29', '2028-01-01', '2032-12-31')).toEqual([
      '2028-02-29',
      '2029-02-28',
      '2030-02-28',
      '2031-02-28',
      '2032-02-29',
    ]);
  });

  it('a cada 2 anos', () => {
    expect(
      dates(rule({ freq: 'anual', interval: 2 }), '2026-03-10', '2026-01-01', '2031-12-31'),
    ).toEqual(['2026-03-10', '2028-03-10', '2030-03-10']);
  });
});

describe('término', () => {
  it('data final inclusiva', () => {
    const r = rule({ freq: 'diaria', end: { kind: 'em', date: '2026-11-12' } });
    expect(dates(r, '2026-11-10', '2026-11-01', '2026-11-30')).toEqual([
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
    ]);
  });

  it('após N vezes conta também as puladas (o motor não sabe de exceções: o índice é fixo)', () => {
    const r = rule({ freq: 'diaria', interval: 2, end: { kind: 'apos', count: 3 } });
    expect(occurrencesBetween(r, '2026-11-10', { from: '2026-11-01', to: '2026-12-31' })).toEqual([
      { date: '2026-11-10', index: 0 },
      { date: '2026-11-12', index: 1 },
      { date: '2026-11-14', index: 2 },
    ]);
  });
});

describe('limites de segurança', () => {
  it(`no máximo ${MAX_OCCURRENCES_PER_WINDOW} ocorrências por janela`, () => {
    const out = occurrencesBetween(rule({ freq: 'diaria' }), '2020-01-01', {
      from: '2020-01-01',
      to: '2030-12-31',
    });
    expect(out).toHaveLength(MAX_OCCURRENCES_PER_WINDOW);
  });

  it(`nada depois de ${HORIZON_DAYS} dias à frente de hoje`, () => {
    const out = dates(
      rule({ freq: 'anual' }),
      '2026-11-10',
      '2026-01-01',
      '2040-12-31',
      '2026-11-10',
    );
    // 730 dias depois de 10/11/2026 é 09/11/2028 (2028 é bissexto): a de 10/11/2028 fica de fora.
    expect(out).toEqual(['2026-11-10', '2027-11-10']);
  });

  it('série diária “para sempre” numa janela de um ano é rápida', () => {
    const t = performance.now();
    for (let i = 0; i < 50; i += 1) {
      occurrencesBetween(rule({ freq: 'diaria' }), '2000-01-01', {
        from: '2030-01-01',
        to: '2030-12-31',
      });
    }
    expect(performance.now() - t).toBeLessThan(1000);
  });
});

describe('auxiliares', () => {
  afterEach(() => vi.useRealTimers());

  it('occursOnDay e nextOccurrences (prévia das próximas 5)', () => {
    const r = rule({ freq: 'semanal', weekdays: [1, 3] });
    expect(occursOnDay(r, '2026-11-11', '2026-11-16')).toBe(true);
    expect(occursOnDay(r, '2026-11-11', '2026-11-17')).toBe(false);
    expect(nextOccurrences(r, '2026-11-11', '2026-11-11', 5)).toEqual([
      '2026-11-11',
      '2026-11-16',
      '2026-11-18',
      '2026-11-23',
      '2026-11-25',
    ]);
    expect(
      nextOccurrences(rule({ freq: 'anual', interval: 5 }), '2026-01-01', '2026-01-01', 2),
    ).toEqual(['2026-01-01', '2031-01-01']);
  });
});

describe('describeRule', () => {
  it.each([
    [rule({ freq: 'diaria' }), '2026-11-10', 'Todo dia'],
    [rule({ freq: 'diaria', interval: 2 }), '2026-11-10', 'A cada 2 dias'],
    [rule({ freq: 'semanal', weekdays: [1, 2, 3, 4, 5] }), '2026-11-10', 'Dias úteis'],
    [rule({ freq: 'semanal', weekdays: [0, 1, 2, 3, 4, 5, 6] }), '2026-11-10', 'Todo dia'],
    [
      rule({ freq: 'semanal', weekdays: [1, 3], end: { kind: 'em', date: '2026-12-20' } }),
      '2026-11-10',
      'Toda segunda e quarta, até 20/12',
    ],
    [rule({ freq: 'semanal', weekdays: [6] }), '2026-11-10', 'Todo sábado'],
    [rule({ freq: 'semanal' }), '2026-11-10', 'Toda terça'],
    [rule({ freq: 'semanal', interval: 2 }), '2026-11-10', 'A cada 2 semanas, terça'],
    [
      rule({ freq: 'mensal', monthDay: 5, end: { kind: 'apos', count: 10 } }),
      '2026-11-05',
      'Todo dia 5, 10 vezes',
    ],
    [rule({ freq: 'mensal', monthDay: 'ultimo' }), '2026-11-30', 'Todo último dia do mês'],
    [rule({ freq: 'mensal', interval: 3 }), '2026-11-15', 'A cada 3 meses, no dia 15'],
    [rule({ freq: 'anual' }), '2028-02-29', 'Todo ano em 29/02'],
    [
      rule({ freq: 'anual', interval: 2, end: { kind: 'em', date: '2030-03-10' } }),
      '2026-03-10',
      'A cada 2 anos, em 10/03, até 10/03/2030',
    ],
    [rule({ freq: 'diaria', end: { kind: 'apos', count: 1 } }), '2026-11-10', 'Todo dia, 1 vez'],
  ])('%#: %s', (r, anchor, text) => {
    expect(describeRule(r, anchor)).toBe(text);
  });
});

describe('schema', () => {
  it('valida intervalo, término e campos fora da frequência, em pt-BR', () => {
    const bad = (r: object) =>
      recurrenceSchema.safeParse({ freq: 'diaria', interval: 1, ...r }).error?.issues[0]?.message;
    expect(bad({ interval: 0 })).toBe('O intervalo deve ser de pelo menos 1.');
    expect(bad({ end: { kind: 'apos', count: 1000 } })).toBe('Use no máximo 999 vezes.');
    expect(bad({ weekdays: [1] })).toBe('Dias da semana só na repetição semanal.');
    expect(
      recurrenceSchema.parse({ freq: 'semanal', interval: 1, weekdays: [3, 1, 3] }).weekdays,
    ).toEqual([1, 3]);
  });
});
