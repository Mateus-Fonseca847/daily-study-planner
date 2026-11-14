import { z } from 'zod';
import { localDateSchema } from './dates';

/** Frequência da repetição (semana começa no domingo). */
export const RECURRENCE_FREQS = ['diaria', 'semanal', 'mensal', 'anual'] as const;

/** Limites de entrada (validação em pt-BR na UI e no schema). */
export const MAX_RECURRENCE_INTERVAL = 99;
export const MAX_RECURRENCE_COUNT = 999;

export const recurrenceEndSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('nunca') }),
  /** Data final inclusiva. */
  z.object({ kind: z.literal('em'), date: localDateSchema }),
  /** Número total de ocorrências, contando também as puladas. */
  z.object({
    kind: z.literal('apos'),
    count: z
      .number('Informe o número de vezes.')
      .int('Use um número inteiro.')
      .min(1, 'Repita pelo menos 1 vez.')
      .max(MAX_RECURRENCE_COUNT, `Use no máximo ${MAX_RECURRENCE_COUNT} vezes.`),
  }),
]);

/**
 * Regra de repetição de um compromisso. A data inicial (âncora) é o dia do `start` do evento; o
 * horário e a duração são os da própria série.
 */
export const recurrenceSchema = z
  .object({
    freq: z.enum(RECURRENCE_FREQS),
    interval: z
      .number('Informe o intervalo.')
      .int('Use um número inteiro.')
      .min(1, 'O intervalo deve ser de pelo menos 1.')
      .max(
        MAX_RECURRENCE_INTERVAL,
        `O intervalo deve ser de no máximo ${MAX_RECURRENCE_INTERVAL}.`,
      ),
    /** Semanal: 0 = domingo … 6 = sábado. Ausente = o dia da semana da data inicial. */
    weekdays: z
      .array(z.number().int().min(0).max(6))
      .min(1, 'Escolha pelo menos um dia da semana.')
      .transform((days) => [...new Set(days)].sort((a, b) => a - b))
      .optional(),
    /** Mensal: dia 1–31 (meses menores usam o último dia) ou o último dia. Ausente = o da data inicial. */
    monthDay: z.union([z.number().int().min(1).max(31), z.literal('ultimo')]).optional(),
    end: recurrenceEndSchema.default({ kind: 'nunca' }),
  })
  .superRefine((rule, ctx) => {
    if (rule.weekdays && rule.freq !== 'semanal') {
      ctx.addIssue({
        code: 'custom',
        message: 'Dias da semana só na repetição semanal.',
        path: ['weekdays'],
      });
    }
    if (rule.monthDay !== undefined && rule.freq !== 'mensal') {
      ctx.addIssue({
        code: 'custom',
        message: 'Dia do mês só na repetição mensal.',
        path: ['monthDay'],
      });
    }
  });

export type RecurrenceFreq = (typeof RECURRENCE_FREQS)[number];
export type RecurrenceEnd = z.infer<typeof recurrenceEndSchema>;
export type Recurrence = z.infer<typeof recurrenceSchema>;

/** Id da ocorrência: `eventoId@aaaa-mm-dd` (no máximo uma por dia em cada série). */
export const occurrenceId = (eventId: string, date: string): string => `${eventId}@${date}`;

/** Separa `eventoId@aaaa-mm-dd`; `null` se não for um id de ocorrência. */
export function parseOccurrenceId(id: string): { eventId: string; date: string } | null {
  const at = id.lastIndexOf('@');
  if (at <= 0) return null;
  const date = id.slice(at + 1);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? { eventId: id.slice(0, at), date } : null;
}
