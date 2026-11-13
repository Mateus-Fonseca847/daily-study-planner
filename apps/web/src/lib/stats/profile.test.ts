import { describe, expect, it } from 'vitest';
import { EVERY_DAY, habitLogId, habitSchema } from '@daily/shared';
import { task } from '../data/test-utils';
import { manualFocusSession, parseManualMinutes } from '../focus/manual';
import { buildHabitContext } from '../habits';
import { profileTotals } from './profile';

const TODAY = '2026-11-11'; // quarta (semana: 09–15)

describe('profileTotals', () => {
  const habit = habitSchema.parse({
    id: 'h',
    name: 'Leitura',
    icon: 'book-open',
    color: 'ciano',
    type: 'check',
    unit: '',
    source: 'manual',
    rules: [{ since: '2026-11-01', repeat: EVERY_DAY, target: null, time: null }],
    createdAt: '2026-11-01T08:00:00',
    order: 0,
  });
  const logs = ['2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10'].map((date) => ({
    id: habitLogId('h', date),
    habitId: 'h',
    date,
    value: 1,
    updatedAt: `${date}T09:00:00`,
  }));
  const sessions = [
    { ...manualFocusSession({ date: '2026-11-10', minutes: 30, note: '' }), id: 'm' },
    {
      id: 'c',
      startedAt: '2026-11-02T09:00:00',
      plannedSec: 1500,
      actualSec: 1500,
      status: 'concluida' as const,
      subjectId: null,
      examId: null,
      origin: 'cronometro' as const,
      note: '',
    },
  ];

  it('soma tarefas concluídas, foco (cronômetro + manual), melhor sequência e dias ativos', () => {
    const ctx = buildHabitContext(
      { habitLogs: logs, waterLogs: [], focusSessions: sessions, restDays: [] },
      TODAY,
    );
    const totals = profileTotals(
      {
        events: [task('a', { status: 'concluido' }), task('b'), task('c', { status: 'cancelado' })],
        focusSessions: sessions,
        waterLogs: [{ id: 'w', date: '2026-11-05', ml: 250, time: '10:00' }],
        habitLogs: logs,
        habits: [habit],
      },
      ctx,
    );
    expect(totals).toEqual({
      tasksDone: 1,
      focusWeekSec: 1800,
      focusTotalSec: 3300,
      bestStreak: { days: 4, habit: 'Leitura' },
      activeDays: 6, // 02 (foco), 05 (água), 07–10 (hábito; 10 também foco)
    });
  });
});

describe('parseManualMinutes', () => {
  it.each([
    ['45', 45],
    ['90min', 90],
    ['1:30', 90],
    ['1h30', 90],
    ['2h', 120],
    [' 1h 5 ', 65],
  ])('“%s” = %i min', (text, minutes) => {
    expect(parseManualMinutes(text)).toBe(minutes);
  });
  it.each(['', 'abc', '1:75', '-5'])('recusa “%s”', (text) => {
    expect(parseManualMinutes(text)).toBeNull();
  });
});
