import { describe, expect, it } from 'vitest';
import type { FocusSession } from '@daily/shared';
import {
  formatDayTotal,
  formatFraction,
  formatSessionCount,
  formatShortDay,
  formatClock,
} from './format';
import { topFocusDays } from './top-days';

const NOW = new Date(2026, 10, 10, 10, 30);

let n = 0;
const session = (
  startedAt: string,
  actualSec: number,
  status: FocusSession['status'] = 'concluida',
): FocusSession => ({
  id: `s${n++}`,
  startedAt,
  plannedSec: 1500,
  actualSec,
  status,
  subjectId: null,
  examId: null,
  blockId: null,
});

describe('topFocusDays', () => {
  it('lista vazia → nada', () => {
    expect(topFocusDays([], 7, NOW)).toEqual([]);
  });

  it('soma por dia, ordena pelo tempo e limita ao máximo pedido', () => {
    const sessions = [
      session('2026-11-08T09:00:00', 1500),
      session('2026-11-08T15:00:00', 1500),
      session('2026-11-09T09:00:00', 4000),
      session('2026-11-07T09:00:00', 600),
    ];
    const days = topFocusDays(sessions, 2, NOW);
    expect(days.map((d) => [d.day, d.seconds, d.sessions])).toEqual(
      [
        ['2026-11-08', 3000, 2],
        ['2026-11-09', 4000, 1],
      ].sort((a, b) => (b[1] as number) - (a[1] as number)),
    );
  });

  it('menos de 7 dias devolve só os que existem', () => {
    const days = topFocusDays([session('2026-11-01T09:00:00', 900)], 7, NOW);
    expect(days).toHaveLength(1);
  });

  it('empate: o dia mais recente primeiro', () => {
    const days = topFocusDays(
      [session('2026-11-01T09:00:00', 1500), session('2026-11-05T09:00:00', 1500)],
      7,
      NOW,
    );
    expect(days.map((d) => d.day)).toEqual(['2026-11-05', '2026-11-01']);
  });

  it('sessão que cruza a meia-noite conta no dia em que começou', () => {
    const days = topFocusDays([session('2026-11-09T23:50:00', 1500)], 7, NOW);
    expect(days).toEqual([{ day: '2026-11-09', seconds: 1500, sessions: 1, today: false }]);
  });

  it('interrompidas contam como as concluídas (pelo tempo real) e hoje é marcado', () => {
    const days = topFocusDays(
      [session('2026-11-10T08:00:00', 400, 'interrompida'), session('2026-11-10T09:00:00', 1500)],
      7,
      NOW,
    );
    expect(days).toEqual([{ day: '2026-11-10', seconds: 1900, sessions: 2, today: true }]);
  });

  it('ignora sessões sem tempo real', () => {
    expect(topFocusDays([session('2026-11-10T08:00:00', 0, 'interrompida')], 7, NOW)).toEqual([]);
  });
});

describe('formatação do painel e da fração', () => {
  it('total do dia', () => {
    expect(formatDayTotal(45 * 60)).toBe('45 min');
    expect(formatDayTotal(2 * 3600 + 15 * 60)).toBe('2h15');
    expect(formatDayTotal(2 * 3600)).toBe('2h');
    expect(formatDayTotal(3600 + 5 * 60)).toBe('1h05');
    expect(formatDayTotal(59 * 60 + 40)).toBe('1h');
  });

  it('contagem de sessões e data curta', () => {
    expect(formatSessionCount(1)).toBe('1 sessão');
    expect(formatSessionCount(3)).toBe('3 sessões');
    expect(formatShortDay('2026-11-10')).toBe('ter., 10 nov.');
  });

  it('fração: três dígitos do segundo corrente, truncando', () => {
    expect(formatFraction(290)).toBe('.290');
    expect(formatFraction(5)).toBe('.005');
    expect(formatFraction(1000)).toBe('.000');
    expect(formatFraction(18 * 60_000 - 123)).toBe('.877');
    expect(formatFraction(1234.9)).toBe('.234');
    expect(formatFraction(-4)).toBe('.000');
  });

  it('dígitos truncados combinam com a fração (24:59.200 e não 25:00)', () => {
    const ms = 24 * 60_000 + 59_200;
    expect(formatClock(ms)).toBe('25:00');
    expect(formatClock(ms, 'down')).toBe('24:59');
    expect(formatFraction(ms)).toBe('.200');
  });
});
