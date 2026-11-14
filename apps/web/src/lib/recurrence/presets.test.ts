import { describe, expect, it } from 'vitest';
import { formatPreviewDate, presetOf, presetsFor, validateRule } from './presets';

// Quarta, 11/11/2026.
const ANCHOR = '2026-11-11';

describe('atalhos de repetição', () => {
  it('são calculados para o dia da tarefa', () => {
    const labels = presetsFor(ANCHOR).map((p) => p.label);
    expect(labels).toEqual([
      'Não repete',
      'Todo dia',
      'Dias úteis (seg a sex)',
      'Toda semana (quarta)',
      'Todo mês (dia 11)',
      'Todo ano',
      'Personalizado…',
    ]);
  });

  it('reconhecem a regra (inclusive a forma implícita) e o resto é personalizado', () => {
    for (const p of presetsFor(ANCHOR)) {
      if (p.rule) expect(presetOf(p.rule, ANCHOR)).toBe(p.key);
    }
    expect(presetOf(null, ANCHOR)).toBe('nao');
    expect(presetOf({ freq: 'semanal', interval: 1, end: { kind: 'nunca' } }, ANCHOR)).toBe(
      'semanal',
    );
    expect(presetOf({ freq: 'diaria', interval: 1, end: { kind: 'apos', count: 3 } }, ANCHOR)).toBe(
      'personalizado',
    );
    expect(presetOf({ freq: 'semanal', interval: 2, end: { kind: 'nunca' } }, ANCHOR)).toBe(
      'personalizado',
    );
  });
});

describe('validação em pt-BR', () => {
  it.each([
    [
      { freq: 'diaria', interval: 0, end: { kind: 'nunca' } },
      'O intervalo deve ser de pelo menos 1.',
    ],
    [
      { freq: 'diaria', interval: 100, end: { kind: 'nunca' } },
      'O intervalo deve ser de no máximo 99.',
    ],
    [
      { freq: 'semanal', interval: 1, weekdays: [], end: { kind: 'nunca' } },
      'Escolha pelo menos um dia da semana.',
    ],
    [{ freq: 'diaria', interval: 1, end: { kind: 'apos', count: 0 } }, 'Repita pelo menos 1 vez.'],
    [
      { freq: 'diaria', interval: 1, end: { kind: 'apos', count: 1000 } },
      'Use no máximo 999 vezes.',
    ],
    [
      { freq: 'diaria', interval: 1, end: { kind: 'em', date: '2026-11-10' } },
      'A data final não pode ser antes do início.',
    ],
    [{ freq: 'diaria', interval: 1, end: { kind: 'em', date: '' } }, 'Data inválida.'],
  ])('%#', (rule, message) => {
    expect(validateRule(rule, ANCHOR)).toBe(message);
  });

  it('regra válida não tem erro', () => {
    expect(
      validateRule(
        { freq: 'mensal', interval: 1, monthDay: 'ultimo', end: { kind: 'nunca' } },
        ANCHOR,
      ),
    ).toBeNull();
  });
});

describe('prévia', () => {
  it('dia da semana e data; o ano só quando muda', () => {
    expect(formatPreviewDate('2026-11-16', ANCHOR)).toBe('seg, 16/11');
    expect(formatPreviewDate('2027-01-04', ANCHOR)).toBe('seg, 04/01/2027');
  });
});
