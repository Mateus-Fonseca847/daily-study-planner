import { describe, expect, it } from 'vitest';
import { formatCountdown } from './countdown';

const now = new Date(2026, 10, 10, 10, 30); // 10/11/2026 10:30

describe('formatCountdown', () => {
  it('hoje, com a hora (e minutos quando não for hora cheia)', () => {
    expect(formatCountdown(new Date(2026, 10, 10, 14, 0), now)).toBe('hoje às 14h');
    expect(formatCountdown(new Date(2026, 10, 10, 14, 30), now)).toBe('hoje às 14h30');
    expect(formatCountdown(new Date(2026, 10, 10, 9, 5), now)).toBe('hoje às 9h05');
  });

  it('amanhã e em N dias, contando dias de calendário (não 24 h)', () => {
    expect(formatCountdown(new Date(2026, 10, 11, 0, 5), new Date(2026, 10, 10, 23, 59))).toBe(
      'amanhã',
    );
    expect(formatCountdown(new Date(2026, 10, 11, 8, 0), now)).toBe('amanhã');
    expect(formatCountdown(new Date(2026, 10, 13, 8, 0), now)).toBe('em 3 dias');
    expect(formatCountdown(new Date(2026, 11, 10, 8, 0), now)).toBe('em 30 dias');
  });

  it('passado: ontem e há N dias', () => {
    expect(formatCountdown(new Date(2026, 10, 9, 23, 0), now)).toBe('ontem');
    expect(formatCountdown(new Date(2026, 10, 8, 8, 0), now)).toBe('há 2 dias');
  });

  it('atravessa virada de mês e de ano', () => {
    expect(formatCountdown(new Date(2027, 0, 1, 8, 0), new Date(2026, 11, 31, 20, 0))).toBe(
      'amanhã',
    );
    expect(formatCountdown(new Date(2026, 11, 29, 8, 0), new Date(2027, 0, 1, 8, 0))).toBe(
      'há 3 dias',
    );
  });
});
