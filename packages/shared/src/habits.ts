import { z } from 'zod';
import { localDateSchema, localDateTimeSchema } from './dates';

const id = z.string().min(1);

/** Conjunto fixo de ícones lucide disponíveis para hábitos (inclui os das antigas metas). */
export const HABIT_ICONS = [
  'dumbbell',
  'droplets',
  'swords',
  'book-open',
  'moon',
  'bike',
  'heart',
  'apple',
  'sun',
  'coffee',
  'footprints',
  'target',
] as const;
export const DEFAULT_HABIT_ICON = 'target';

/** Chaves da paleta de hábitos (`--ds-habit-*` em tokens.css); a primeira é o amarelo do Daily. */
export const HABIT_COLORS = [
  'amarelo',
  'azul',
  'verde',
  'laranja',
  'rosa',
  'violeta',
  'turquesa',
] as const;

/** `check`: feito ou não; `quantidade`: valor numérico contra uma meta. */
export const HABIT_TYPES = ['check', 'quantidade'] as const;

/** `manual`: o usuário registra; as demais derivam de água, sessões de foco e blocos de estudo. */
export const HABIT_SOURCES = ['manual', 'agua', 'foco', 'blocos'] as const;

export const habitIconSchema = z.enum(HABIT_ICONS);
export const habitColorSchema = z.enum(HABIT_COLORS);
export const habitTypeSchema = z.enum(HABIT_TYPES);
export const habitSourceSchema = z.enum(HABIT_SOURCES);

/** Horário opcional do hábito: início `HH:mm` e duração em minutos. */
export const habitTimeSchema = z.object({
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido.'),
  durationMin: z
    .number('Informe a duração.')
    .int('Use minutos inteiros.')
    .min(1, 'A duração deve ser de pelo menos 1 minuto.')
    .max(1440, 'A duração deve ser de no máximo 24 horas.'),
});

/** Repetição: dias da semana (0 = domingo … 6 = sábado) ou a cada N dias a partir da âncora da regra. */
export const repeatSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('dias-da-semana'),
    days: z
      .array(z.number().int().min(0).max(6))
      .min(1, 'Escolha pelo menos um dia da semana.')
      .transform((days) => [...new Set(days)].sort((a, b) => a - b)),
  }),
  z.object({
    kind: z.literal('a-cada-n-dias'),
    interval: z
      .number('Informe o intervalo.')
      .int('Use um número inteiro de dias.')
      .min(2, 'O intervalo deve ser de pelo menos 2 dias.')
      .max(365, 'O intervalo deve ser de no máximo 365 dias.'),
  }),
]);

/** Uma versão da regra do hábito, válida a partir de `since` (a âncora do intervalo de N dias). */
export const habitRuleSchema = z.object({
  since: localDateSchema,
  repeat: repeatSchema,
  /** Meta do dia (obrigatória e > 0 nos hábitos de quantidade). */
  target: z.number().positive('A meta deve ser maior que zero.').nullable().default(null),
  time: habitTimeSchema.nullable().default(null),
});

export const habitSchema = z
  .object({
    id,
    name: z
      .string()
      .trim()
      .min(1, 'Informe o nome do hábito.')
      .max(60, 'Use no máximo 60 caracteres.'),
    icon: habitIconSchema,
    color: habitColorSchema,
    type: habitTypeSchema,
    /** Unidade curta (“ml”, “min”, “vezes”); vazia nos hábitos de check. */
    unit: z.string().trim().max(12, 'Use no máximo 12 caracteres.').default(''),
    source: habitSourceSchema,
    /** Regras em ordem crescente de `since`; a última com `since ≤ dia` vale naquele dia. */
    rules: z.array(habitRuleSchema).min(1, 'O hábito precisa de ao menos uma regra.'),
    createdAt: localDateTimeSchema,
    /** Dias depois dele não contam como agendados (o próprio dia conta). */
    archivedAt: localDateTimeSchema.nullable().default(null),
    /** Fim opcional: dias depois dele não são agendados, sem arquivar o hábito. */
    endsOn: localDateSchema.nullable().default(null),
    order: z.number().int().min(0),
  })
  .superRefine((habit, ctx) => {
    const issue = (message: string, path: (string | number)[]) =>
      ctx.addIssue({ code: 'custom', message, path });
    habit.rules.forEach((rule, i) => {
      const previous = habit.rules[i - 1];
      if (previous && previous.since >= rule.since) {
        issue('As regras devem estar em ordem crescente de data.', ['rules', i, 'since']);
      }
      if (habit.type === 'quantidade' && (rule.target === null || rule.target <= 0)) {
        issue('Informe a meta do hábito.', ['rules', i, 'target']);
      }
    });
    if ((habit.source === 'agua' || habit.source === 'foco') && habit.type !== 'quantidade') {
      issue('Esta fonte automática exige um hábito de quantidade.', ['type']);
    }
    if (habit.source === 'blocos' && habit.type !== 'check') {
      issue('A fonte “blocos de estudo” exige um hábito de check.', ['type']);
    }
    if (habit.endsOn !== null && habit.endsOn < habit.rules[0]!.since) {
      issue('O fim não pode ser antes do início.', ['endsOn']);
    }
  });

/** Registro de um hábito manual num dia. `id` = `${habitId}:${date}`. */
export const habitLogSchema = z.object({
  id,
  habitId: id,
  date: localDateSchema,
  value: z.number('Informe um valor.').min(0, 'O valor não pode ser negativo.'),
  updatedAt: localDateTimeSchema,
});

export type HabitIcon = z.infer<typeof habitIconSchema>;
export type HabitColor = z.infer<typeof habitColorSchema>;
export type HabitType = z.infer<typeof habitTypeSchema>;
export type HabitSource = z.infer<typeof habitSourceSchema>;
export type HabitTime = z.infer<typeof habitTimeSchema>;
export type Repeat = z.infer<typeof repeatSchema>;
export type HabitRule = z.infer<typeof habitRuleSchema>;
export type Habit = z.infer<typeof habitSchema>;
export type HabitLog = z.infer<typeof habitLogSchema>;

export const habitLogId = (habitId: string, date: string): string => `${habitId}:${date}`;

/** Todo dia = os 7 dias da semana. */
export const EVERY_DAY: Repeat = { kind: 'dias-da-semana', days: [0, 1, 2, 3, 4, 5, 6] };
