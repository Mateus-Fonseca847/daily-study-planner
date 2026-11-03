import { describe, expect, it } from 'vitest';
import type { StudyEvent } from '@daily/shared';
import { compactDayMarks, dayAgenda, dayCellLabel, daySummary } from './compact';

const ev = (id: string, type: StudyEvent['type'], start: string): StudyEvent =>
  ({ id, type, start, title: id, status: 'pendente' }) as unknown as StudyEvent;

describe('compactDayMarks', () => {
  it('um ponto por tipo, na ordem do horário', () => {
    const marks = compactDayMarks([
      ev('c', 'prova', '2026-10-29T15:00:00'),
      ev('a', 'estudo', '2026-10-29T09:00:00'),
      ev('b', 'estudo', '2026-10-29T10:00:00'),
    ]);
    expect(marks.types).toEqual(['estudo', 'prova']);
    expect(marks.extra).toBe(1); // o segundo “estudo” não ganha ponto próprio
    expect(marks.total).toBe(3);
  });

  it('no máximo três pontos; o resto vira contagem', () => {
    const marks = compactDayMarks([
      ev('1', 'estudo', '2026-10-29T08:00:00'),
      ev('2', 'prova', '2026-10-29T09:00:00'),
      ev('3', 'entrega', '2026-10-29T10:00:00'),
      ev('4', 'revisao', '2026-10-29T11:00:00'),
      ev('5', 'especial', '2026-10-29T12:00:00'),
    ]);
    expect(marks.types).toEqual(['estudo', 'prova', 'entrega']);
    expect(marks.extra).toBe(2);
  });

  it('dia vazio não tem pontos nem contagem', () => {
    expect(compactDayMarks([])).toEqual({ types: [], extra: 0, total: 0 });
  });
});

describe('dayAgenda', () => {
  it('ordena por horário sem alterar a lista original', () => {
    const list = [
      ev('b', 'estudo', '2026-10-29T10:00:00'),
      ev('a', 'prova', '2026-10-29T08:00:00'),
    ];
    expect(dayAgenda(list).map((e) => e.id)).toEqual(['a', 'b']);
    expect(list[0]!.id).toBe('b');
  });
});

describe('dayCellLabel', () => {
  it('descreve a quantidade e marca o dia de hoje', () => {
    expect(dayCellLabel('29 de outubro', 0, false)).toBe('29 de outubro, sem eventos');
    expect(dayCellLabel('29 de outubro', 1, true)).toBe('29 de outubro (hoje), 1 evento');
    expect(dayCellLabel('30 de outubro', 4, false)).toBe('30 de outubro, 4 eventos');
  });
});

describe('daySummary', () => {
  it('hábitos pendentes e prova', () => {
    expect(
      daySummary({
        scheduledHabits: 3,
        pendingHabits: 2,
        habitsActionable: true,
        examCountdown: 'em 3 dias',
      }),
    ).toBe('2 hábitos pendentes · prova em 3 dias');
  });

  it('um pendente usa o singular', () => {
    expect(
      daySummary({
        scheduledHabits: 2,
        pendingHabits: 1,
        habitsActionable: true,
        examCountdown: null,
      }),
    ).toBe('1 hábito pendente · sem prova à vista');
  });

  it('tudo feito, sem hábitos e dias futuros', () => {
    expect(
      daySummary({
        scheduledHabits: 2,
        pendingHabits: 0,
        habitsActionable: true,
        examCountdown: 'amanhã',
      }),
    ).toBe('Hábitos em dia · prova amanhã');
    expect(
      daySummary({
        scheduledHabits: 0,
        pendingHabits: 0,
        habitsActionable: true,
        examCountdown: null,
      }),
    ).toBe('Sem hábitos · sem prova à vista');
    expect(
      daySummary({
        scheduledHabits: 3,
        pendingHabits: 3,
        habitsActionable: false,
        examCountdown: null,
      }),
    ).toBe('3 hábitos agendados · sem prova à vista');
  });
});
