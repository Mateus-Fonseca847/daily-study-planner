import type { AchievementDef } from '../../../lib/achievements/catalog';
import { cn } from '../../../lib/cn';
import { ACHIEVEMENT_ICON, TIER_CLASS, tierOf } from './meta';

interface MedalProps {
  def: AchievementDef;
  level: number;
  size?: 'md' | 'lg';
}

/**
 * Medalha desenhada por composição: disco no fundo suave do nível, anel do nível e o ícone da
 * medalha na tinta do nível. Bloqueada: silhueta (anel tracejado e ícone apagado). Decorativa: o
 * nome acessível fica no cartão ou no botão que a contém.
 */
export function Medal({ def, level, size = 'md' }: MedalProps) {
  const Icon = ACHIEVEMENT_ICON[def.icon];
  const tier = TIER_CLASS[tierOf(def, level)];
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border-medal',
        size === 'lg' ? 'size-medal-lg' : 'size-medal',
        tier.ring,
        tier.soft,
        tier.ink,
      )}
    >
      <Icon strokeWidth={1.75} className={size === 'lg' ? 'size-goal-icon' : 'size-icon'} />
    </span>
  );
}
