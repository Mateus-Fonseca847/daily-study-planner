import { z } from 'zod';

const id = z.string().min(1);

/** Data local `yyyy-MM-dd` (nunca UTC). */
export const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.');
export const localDateTimeSchema = z.iso.datetime({ local: true });

/** Conjunto pequeno de ícones lucide disponíveis para metas. */
export const GOAL_ICONS = [
  'moon',
  'droplets',
  'dumbbell',
  'book-open',
  'heart',
  'coffee',
  'sun',
  'apple',
  'footprints',
  'target',
] as const;

/** `manual` o usuário marca; `auto-agua` e `auto-estudo` são calculadas pelos dados. */
export const GOAL_KINDS = ['manual', 'auto-agua', 'auto-estudo'] as const;

export const goalIconSchema = z.enum(GOAL_ICONS);
export const goalKindSchema = z.enum(GOAL_KINDS);

export const goalSchema = z.object({
  id,
  title: z
    .string()
    .trim()
    .min(1, 'Informe o título da meta.')
    .max(60, 'Use no máximo 60 caracteres.'),
  icon: goalIconSchema,
  kind: goalKindSchema,
  order: z.number().int().min(0),
  createdAt: localDateTimeSchema,
  /** Preenchido quando a meta é arquivada (deixa de valer a partir desse dia). */
  archivedAt: localDateTimeSchema.nullable().default(null),
});

/** Registro de uma meta manual num dia. `id` = `${goalId}:${date}`. */
export const goalLogSchema = z.object({
  id,
  goalId: id,
  date: localDateSchema,
  done: z.boolean(),
});

export const waterLogSchema = z.object({
  id,
  date: localDateSchema,
  ml: z.number().int().min(1).max(5000),
  /** Horário local `HH:mm`. */
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido.'),
});

export type GoalIcon = z.infer<typeof goalIconSchema>;
export type GoalKind = z.infer<typeof goalKindSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type GoalLog = z.infer<typeof goalLogSchema>;
export type WaterLog = z.infer<typeof waterLogSchema>;

export const goalLogId = (goalId: string, date: string): string => `${goalId}:${date}`;

/** Metas criadas no primeiro acesso (editáveis). */
export function defaultGoals(createdAt: string): Goal[] {
  return [
    { id: 'goal-sleep', title: 'Dormir 7h', icon: 'moon', kind: 'manual' },
    { id: 'goal-water', title: 'Beber 2 L de água', icon: 'droplets', kind: 'auto-agua' },
    { id: 'goal-exercise', title: 'Exercício', icon: 'dumbbell', kind: 'manual' },
    {
      id: 'goal-study',
      title: 'Cumprir blocos de estudo de hoje',
      icon: 'book-open',
      kind: 'auto-estudo',
    },
  ].map((goal, order) => goalSchema.parse({ ...goal, order, createdAt }));
}
