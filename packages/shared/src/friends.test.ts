import { describe, expect, it } from 'vitest';
import {
  normalizeSearchTerm,
  REPORT_DETAIL_MAX,
  REPORT_REASONS,
  reportSchema,
  searchTermProblem,
} from './friends';

describe('termo de busca', () => {
  it.each([
    ['  @Bia ', 'bia'],
    ['ANA.LIMA', 'ana.lima'],
    ['@@x', '@x'],
    ['', ''],
  ])('normaliza %j → %j', (raw, term) => {
    expect(normalizeSearchTerm(raw)).toBe(term);
  });

  it.each([
    ['', 'curto'],
    ['bi', 'curto'],
    ['bia', null],
    ['a'.repeat(20), null],
    ['a'.repeat(21), 'longo'],
    ['b%a', 'caracteres'],
    ['ana lima', 'caracteres'],
    ['joão', 'caracteres'],
    ['@x', 'curto'],
    ['@xy', 'caracteres'],
    ['a._', null],
  ])('%j → %j (as mesmas regras do servidor)', (term, problem) => {
    expect(searchTermProblem(term)).toBe(problem);
  });
});

describe('denúncia', () => {
  it('aceita os 5 motivos do banco', () => {
    expect(REPORT_REASONS.map((r) => r.value)).toEqual([
      'perfil_improprio',
      'foto_impropria',
      'assedio',
      'perfil_falso',
      'outro',
    ]);
  });

  it('detalhe opcional até 500 caracteres, sem espaços nas pontas', () => {
    expect(reportSchema.parse({ reason: 'outro', detail: '  oi  ', alsoBlock: true }).detail).toBe(
      'oi',
    );
    expect(
      reportSchema.safeParse({
        reason: 'outro',
        detail: 'x'.repeat(REPORT_DETAIL_MAX),
        alsoBlock: false,
      }).success,
    ).toBe(true);
    expect(
      reportSchema.safeParse({
        reason: 'outro',
        detail: 'x'.repeat(REPORT_DETAIL_MAX + 1),
        alsoBlock: false,
      }).success,
    ).toBe(false);
  });

  it('recusa motivo fora da lista', () => {
    expect(reportSchema.safeParse({ reason: 'spam', detail: '', alsoBlock: true }).success).toBe(
      false,
    );
  });
});
