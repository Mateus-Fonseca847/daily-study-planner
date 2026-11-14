import { z } from 'zod';

/**
 * Paleta da v4 (as 7 primeiras cores). Fica congelada para a migração de dados da v3, que remapeia
 * as cores antigas só para estas.
 */
export const PALETTE_V4 = ['ciano', 'petroleo', 'gelo', 'lilas', 'fucsia', 'rosa', 'cinza'] as const;

/**
 * Paleta de matérias e hábitos (v5, Prompt 13.2): as 7 da v4 com os mesmos ids e valores (dados
 * antigos desenham igual) mais vermelho, laranja, amarelo, lima, verde e azul. O seletor oferece 8
 * delas (`PICKER_COLORS` no app). Ids estáveis: nunca renomeie nem reordene; só acrescente no fim.
 * Cada chave tem os tokens `--ds-palette-<chave>` nos dois temas.
 */
export const PALETTE_COLORS = [
  ...PALETTE_V4,
  'vermelho',
  'laranja',
  'amarelo',
  'lima',
  'verde',
  'azul',
] as const;

export type PaletteColor = (typeof PALETTE_COLORS)[number];

/** Cor segura para um valor que este app não conhece (ex.: uma cor de uma versão mais nova). */
export const FALLBACK_PALETTE_COLOR: PaletteColor = 'cinza';

export const isPaletteColor = (value: string): value is PaletteColor =>
  (PALETTE_COLORS as readonly string[]).includes(value);

/** Cor conhecida para desenhar; o valor guardado não muda (salvar mantém a escolha original). */
export const resolvePaletteColor = (value: string): PaletteColor =>
  isPaletteColor(value) ? value : FALLBACK_PALETTE_COLOR;

/** Paleta fixa de matérias; cada chave tem um token `--ds-color-subject-<chave>`. */
export const SUBJECT_COLORS = PALETTE_COLORS;

/**
 * A cor guardada é a chave da paleta. O esquema aceita qualquer chave bem formada (não só as
 * conhecidas) para que dados de uma versão mais nova abram sem erro e sem perder a escolha.
 */
export const paletteKeySchema = z
  .string()
  .regex(/^[a-z][a-z-]{0,31}$/, 'Cor inválida.');

export const subjectColorSchema = paletteKeySchema;

export const subjectSchema = z.object({
  id: z.string().min(1),
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome da matéria.')
    .max(60, 'Use no máximo 60 caracteres.'),
  color: subjectColorSchema,
});

export type SubjectColor = z.infer<typeof subjectColorSchema>;
export type Subject = z.infer<typeof subjectSchema>;
