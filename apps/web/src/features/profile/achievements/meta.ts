import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarCheck,
  CalendarSync,
  Droplets,
  Flame,
  Footprints,
  GraduationCap,
  Hourglass,
  ListChecks,
  ListTodo,
  Repeat2,
  Shapes,
  Sparkles,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import type { AchievementDef, AchievementIcon } from '../../../lib/achievements/catalog';
import { levelName } from '../../../lib/achievements/catalog';
import type { Progress } from '../../../lib/achievements/evaluate';
import { fromLocalIso } from '../../../lib/dates';

export const ACHIEVEMENT_ICON: Record<AchievementIcon, LucideIcon> = {
  footprints: Footprints,
  'calendar-sync': CalendarSync,
  'calendar-check': CalendarCheck,
  'list-checks': ListChecks,
  sparkles: Sparkles,
  'graduation-cap': GraduationCap,
  repeat: Repeat2,
  'list-todo': ListTodo,
  hourglass: Hourglass,
  timer: Timer,
  flame: Flame,
  droplets: Droplets,
  shapes: Shapes,
};

export type Tier = 'bronze' | 'silver' | 'gold' | 'single' | 'locked';

/** Classes literais por nível (o Tailwind só gera o que aparece por extenso). */
export const TIER_CLASS: Record<Tier, { ring: string; soft: string; ink: string }> = {
  bronze: { ring: 'border-tier-bronze', soft: 'bg-tier-bronze-soft', ink: 'text-tier-bronze' },
  silver: { ring: 'border-tier-silver', soft: 'bg-tier-silver-soft', ink: 'text-tier-silver' },
  gold: { ring: 'border-tier-gold', soft: 'bg-tier-gold-soft', ink: 'text-tier-gold' },
  single: { ring: 'border-tier-single', soft: 'bg-tier-single-soft', ink: 'text-tier-single' },
  locked: { ring: 'border-line-strong border-dashed', soft: 'bg-hover', ink: 'text-subtle' },
};

export function tierOf(def: AchievementDef, level: number): Tier {
  if (level <= 0) return 'locked';
  if (def.levels.length === 1) return 'single';
  return (['bronze', 'silver', 'gold'] as const)[level - 1] ?? 'gold';
}

/** “Prata”, “Conquistada” (nível único) ou “Bloqueada”. */
export function levelLabel(def: AchievementDef, level: number): string {
  if (level <= 0) return 'Bloqueada';
  return levelName(def, level) ?? 'Conquistada';
}

/** “17 de 25 tarefas”, ou “Todos os níveis” quando acabou. */
export function progressText(def: AchievementDef, p: Progress): string {
  if (p.nextLevel === null) {
    return def.levels.length === 1 ? 'Conquistada' : 'Todos os níveis conquistados';
  }
  const unit = p.goal === 1 ? def.unit.one : def.unit.many;
  return `${Math.min(p.value, p.goal)} de ${p.goal} ${unit}`;
}

export const formatDate = (iso: string): string =>
  format(fromLocalIso(iso), "d 'de' MMM 'de' yyyy", { locale: ptBR });
