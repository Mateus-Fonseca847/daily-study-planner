import { z } from 'zod';
import { localDateTimeSchema } from './dates';

/** Níveis de medalha: 1 bronze, 2 prata, 3 ouro (medalha de nível único só tem o 1). */
export const ACHIEVEMENT_LEVELS = [1, 2, 3] as const;
export type AchievementLevel = (typeof ACHIEVEMENT_LEVELS)[number];

/** Quantas medalhas podem ficar em destaque no perfil. */
export const MAX_FEATURED_ACHIEVEMENTS = 3;

/**
 * Uma medalha conquistada (permanente). Só a conquista é gravada; o progresso é sempre calculado.
 * O `id` é o do catálogo e nunca muda; um id que este app não conhece (de um app mais novo) é
 * mantido como está.
 */
export const achievementSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,40}$/, 'Id de medalha inválido.'),
    level: z.number().int().min(1).max(3),
    /** Quando cada nível foi alcançado (o 1º é o bronze); o último é o nível atual. */
    levels: z.array(localDateTimeSchema).min(1).max(3),
    /** Escolhida para a vitrine do perfil (até 3). */
    featured: z.boolean().default(false),
  })
  .refine((a) => a.levels.length === a.level, {
    message: 'O histórico de níveis não bate com o nível.',
    path: ['levels'],
  });

export type Achievement = z.infer<typeof achievementSchema>;

/** Quando o nível atual foi alcançado. */
export const unlockedAt = (achievement: Achievement): string =>
  achievement.levels[achievement.levels.length - 1]!;
