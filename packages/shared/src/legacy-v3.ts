/**
 * Vocabulário da versão 3 (e anteriores). Fica só para as migrações e a importação de arquivos
 * antigos: nada da UI deve importar daqui.
 */

/** Paleta de matérias até a v3. */
export const LEGACY_SUBJECT_COLORS = [
  'vermelho',
  'laranja',
  'amarelo',
  'verde',
  'turquesa',
  'azul',
  'violeta',
  'rosa',
] as const;

/** Paleta de hábitos até a v3 (a primeira era o amarelo do Daily). */
export const LEGACY_HABIT_COLORS = [
  'amarelo',
  'azul',
  'verde',
  'laranja',
  'rosa',
  'violeta',
  'turquesa',
] as const;
