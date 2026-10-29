import { z } from 'zod';
import { FOCUS_MAX_MINUTES, FOCUS_MIN_MINUTES } from './preferences';
import { localDateTimeSchema } from './dates';

const id = z.string().min(1);
const link = id.nullable().default(null);

export const FOCUS_SESSION_STATUSES = ['concluida', 'interrompida'] as const;
export const focusSessionStatusSchema = z.enum(FOCUS_SESSION_STATUSES);

/** Sessão de foco já encerrada (histórico; entra no backup). */
export const focusSessionSchema = z.object({
  id,
  startedAt: localDateTimeSchema,
  plannedSec: z.number().int().min(1),
  actualSec: z.number().int().min(0),
  status: focusSessionStatusSchema,
  subjectId: link,
  examId: link,
  blockId: link,
});

export const ACTIVE_FOCUS_STATUSES = ['ocioso', 'rodando', 'pausado'] as const;

/** Vínculo opcional da sessão (“Estudando”). */
export const focusLinkSchema = z.object({
  subjectId: link,
  examId: link,
  blockId: link,
});

/**
 * Sessão em andamento (no máximo uma). NÃO entra no backup: vive numa chave própria do
 * armazenamento, só para sobreviver a recarregamentos.
 */
export const activeFocusSchema = z.object({
  id,
  status: z.enum(ACTIVE_FOCUS_STATUSES),
  durationSec: z
    .number()
    .int()
    .min(FOCUS_MIN_MINUTES * 60)
    .max(FOCUS_MAX_MINUTES * 60),
  /** Quando a sessão começou (epoch ms); `null` enquanto ocioso. */
  startedAtMs: z.number().int().nullable().default(null),
  /** Fim previsto (epoch ms), só quando `rodando`. */
  endsAtMs: z.number().int().nullable().default(null),
  /** Tempo restante, só quando `pausado`. */
  remainingMs: z.number().int().min(0).nullable().default(null),
  locked: z.boolean().default(false),
  link: focusLinkSchema.default({ subjectId: null, examId: null, blockId: null }),
  /** Aba que iniciou a sessão: só ela toca o som de fim. */
  tabId: id,
});

export type FocusSessionStatus = z.infer<typeof focusSessionStatusSchema>;
export type FocusSession = z.infer<typeof focusSessionSchema>;
export type FocusLink = z.infer<typeof focusLinkSchema>;
export type ActiveFocus = z.infer<typeof activeFocusSchema>;
