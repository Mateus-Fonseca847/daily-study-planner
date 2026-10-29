import { z } from 'zod';

export const FOCUS_MIN_MINUTES = 1;
export const FOCUS_MAX_MINUTES = 180;

/** Preferências do usuário (uma por instalação). */
export const preferencesSchema = z.object({
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
  focusDurationMin: z
    .number('Informe um número.')
    .int('Use um número inteiro.')
    .min(FOCUS_MIN_MINUTES, `A duração mínima é de ${FOCUS_MIN_MINUTES} minuto.`)
    .max(FOCUS_MAX_MINUTES, `A duração máxima é de ${FOCUS_MAX_MINUTES} minutos.`)
    .default(25),
  lockByDefault: z.boolean().default(false),
});

export type Preferences = z.infer<typeof preferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = preferencesSchema.parse({});
