import { z } from 'zod';
import { localDateSchema } from './dates';

export const waterLogSchema = z.object({
  id: z.string().min(1),
  date: localDateSchema,
  ml: z.number().int().min(1).max(5000),
  /** Horário local `HH:mm`. */
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido.'),
});

export type WaterLog = z.infer<typeof waterLogSchema>;
