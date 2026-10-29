import { z } from 'zod';

export const FOCUS_MIN_MINUTES = 1;
export const FOCUS_MAX_MINUTES = 180;
export const FOCUS_MIN_SECONDS = FOCUS_MIN_MINUTES * 60;
export const FOCUS_MAX_SECONDS = FOCUS_MAX_MINUTES * 60;
export const DEFAULT_FOCUS_SECONDS = 25 * 60;

const preferencesShape = z.object({
  name: z.string().trim().max(40, 'Use no máximo 40 caracteres.').default(''),
  waterGoalMl: z
    .number('Informe um número.')
    .int('Use um número inteiro.')
    .min(250, 'A meta de água deve ser de pelo menos 250 ml.')
    .max(10000, 'A meta de água deve ser de no máximo 10 000 ml.')
    .default(2000),
  cupMl: z
    .number('Informe um número.')
    .int('Use um número inteiro.')
    .min(50, 'O copo deve ter pelo menos 50 ml.')
    .max(1000, 'O copo deve ter no máximo 1 000 ml.')
    .default(250),
  /** Última duração confirmada no Modo Foco, em segundos (1 min a 3 h). */
  focusDurationSec: z
    .number('Informe um número.')
    .int('Use um número inteiro.')
    .min(FOCUS_MIN_SECONDS, 'A duração mínima é de 1 minuto.')
    .max(FOCUS_MAX_SECONDS, 'A duração máxima é de 3 horas.')
    .default(DEFAULT_FOCUS_SECONDS),
  lockByDefault: z.boolean().default(false),
});

/**
 * Compatibilidade: o formato anterior guardava `focusDurationMin` (minutos inteiros).
 * Ele é aceito na leitura e convertido para `focusDurationSec`, sem migração de versão.
 */
function upgradeLegacyFocusDuration(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return raw;
  const { focusDurationMin, ...rest } = raw as Record<string, unknown>;
  if ('focusDurationSec' in rest || typeof focusDurationMin !== 'number') return rest;
  return { ...rest, focusDurationSec: Math.round(focusDurationMin * 60) };
}

/** Preferências do usuário (uma por instalação). */
export const preferencesSchema = z.preprocess(upgradeLegacyFocusDuration, preferencesShape);

export type Preferences = z.infer<typeof preferencesShape>;

export const DEFAULT_PREFERENCES: Preferences = preferencesShape.parse({});
