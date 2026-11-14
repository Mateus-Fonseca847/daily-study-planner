import { describe, expect, it } from 'vitest';
import {
  ageOn,
  birthDateProblem,
  displayNameProblem,
  isTeen,
  normalizeUsername,
  RESERVED_USERNAMES,
  usernameFormatOk,
  usernameProblem,
  usernameSchema,
} from './social';

describe('@ (mesmos casos do pgTAP)', () => {
  it.each([
    ['ab', 'curto'],
    ['abc', null],
    ['abcdefghijklmnopqrst', null],
    ['abcdefghijklmnopqrstu', 'longo'],
    ['Maiuscula', 'caracteres'],
    ['_abc', 'bordas'],
    ['abc.', 'bordas'],
    ['a..b', 'sequencia'],
    ['a._b', 'sequencia'],
    ['a__b', 'sequencia'],
    ['ana maria', 'caracteres'],
    ['joão', 'caracteres'],
    ['emoji😀', 'caracteres'],
    ['ａｂｃ', 'caracteres'], // largura total (unicode)
    ['a.b_c1', null],
    ['admin', 'reservado'],
    ['calendario', 'reservado'],
  ] as const)('%s → %s', (name, problem) => {
    expect(usernameProblem(name)).toBe(problem);
    // O formato (sem os reservados) é exatamente o do banco (social_username_is_valid).
    expect(usernameFormatOk(name)).toBe(problem === null || problem === 'reservado');
  });

  it('normaliza o que a pessoa digitou: tira espaços nas pontas, o “@” e as maiúsculas', () => {
    expect(normalizeUsername('  @Ana.Silva ')).toBe('ana.silva');
    expect(normalizeUsername('ANA')).toBe('ana');
  });

  it('o schema zod usa as mesmas mensagens', () => {
    const result = usernameSchema.safeParse('a..b');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/dois sinais seguidos/);
  });

  it('lista de reservados sem repetição (a comparação com o SQL fica em apps/web)', () => {
    expect(new Set(RESERVED_USERNAMES).size).toBe(RESERVED_USERNAMES.length);
  });
});

describe('nome de exibição', () => {
  it('1 a 40, sem controle, não só espaços', () => {
    expect(displayNameProblem('Ana')).toBeNull();
    expect(displayNameProblem('')).toMatch(/Informe/);
    expect(displayNameProblem('   ')).toMatch(/Informe/);
    expect(displayNameProblem('a'.repeat(40))).toBeNull();
    expect(displayNameProblem('a'.repeat(41))).toMatch(/40/);
    expect(displayNameProblem('Ana\u0007')).toMatch(/invisíveis/);
    expect(displayNameProblem('Ana 😀 Lima')).toBeNull();
  });
});

describe('idade (relógio local, igual ao age() do Postgres)', () => {
  it('14 anos completos no dia do aniversário; 13 anos e 364 dias não', () => {
    expect(ageOn('2012-11-15', '2026-11-15')).toBe(14);
    expect(ageOn('2012-11-16', '2026-11-15')).toBe(13);
    expect(birthDateProblem('2012-11-16', '2026-11-15')).toBe('menor_de_14');
    expect(birthDateProblem('2012-11-15', '2026-11-15')).toBeNull();
  });

  it('29/02: completa o ano em 01/03 nos anos comuns', () => {
    expect(ageOn('2012-02-29', '2026-02-28')).toBe(13);
    expect(ageOn('2012-02-29', '2026-03-01')).toBe(14);
    expect(ageOn('2012-02-29', '2028-02-29')).toBe(16);
  });

  it('virada de ano', () => {
    expect(ageOn('2012-12-31', '2026-12-31')).toBe(14);
    expect(ageOn('2012-12-31', '2026-12-30')).toBe(13);
    expect(ageOn('2012-01-01', '2026-01-01')).toBe(14);
  });

  it('datas inválidas, futuras e antigas', () => {
    expect(birthDateProblem('2010-02-31', '2026-11-15')).toBe('invalida');
    expect(birthDateProblem('abc', '2026-11-15')).toBe('invalida');
    expect(birthDateProblem('2027-01-01', '2026-11-15')).toBe('futura');
    expect(birthDateProblem('1899-12-31', '2026-11-15')).toBe('antiga');
  });

  it('14 a 17 anos é adolescente; 18 no dia não é', () => {
    expect(isTeen('2009-11-16', '2026-11-15')).toBe(true);
    expect(isTeen('2008-11-15', '2026-11-15')).toBe(false);
  });
});
