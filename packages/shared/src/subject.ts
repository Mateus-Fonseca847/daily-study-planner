import { z } from 'zod';

/** Paleta fixa de matérias; cada chave tem um token `--ds-color-subject-<chave>`. */
/**
 * Paleta de matérias e hábitos (v4): sem vermelho, verde, amarelo e laranja (reservados aos status
 * e à marca) e sem repetir o azul da Prova e o roxo do Especial. Tokens `--ds-palette-<chave>`.
 */
export const PALETTE_COLORS = [
  'ciano',
  'petroleo',
  'gelo',
  'lilas',
  'fucsia',
  'rosa',
  'cinza',
] as const;

/** Paleta fixa de matérias; cada chave tem um token `--ds-color-subject-<chave>`. */
export const SUBJECT_COLORS = PALETTE_COLORS;

export const subjectColorSchema = z.enum(SUBJECT_COLORS);

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
