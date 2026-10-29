import { z } from 'zod';

/** Paleta fixa de matérias; cada chave tem um token `--ds-color-subject-<chave>`. */
export const SUBJECT_COLORS = [
  'vermelho',
  'laranja',
  'amarelo',
  'verde',
  'turquesa',
  'azul',
  'violeta',
  'rosa',
] as const;

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
