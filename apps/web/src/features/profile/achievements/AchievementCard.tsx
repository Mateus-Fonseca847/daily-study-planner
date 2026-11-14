import { Lock, Star } from 'lucide-react';
import { unlockedAt } from '@daily/shared';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { cn } from '../../../lib/cn';
import { Medal } from './Medal';
import { formatDate, levelLabel, progressText, TIER_CLASS, tierOf } from './meta';
import type { AchievementItem } from './useAchievements';

/** Nome acessível: título, nível e progresso numa frase. */
export const achievementLabel = ({ def, achieved, progress }: AchievementItem) =>
  `${def.title}, ${levelLabel(def, achieved?.level ?? 0).toLowerCase()}, ${progressText(def, progress)}`;

/** Nível com ícone e texto (estrelas = quantos níveis), nunca só a cor. */
export function LevelTag({ item }: { item: AchievementItem }) {
  const level = item.achieved?.level ?? 0;
  const tier = tierOf(item.def, level);
  const Icon = level === 0 ? Lock : Star;
  const stars = level === 0 || item.def.levels.length === 1 ? 1 : level;
  return (
    <span
      className={cn('inline-flex items-center gap-1 text-sm font-medium', TIER_CLASS[tier].ink)}
    >
      <span className="inline-flex" aria-hidden>
        {Array.from({ length: stars }, (_, i) => (
          <Icon key={i} strokeWidth={1.75} className="size-icon-sm" />
        ))}
      </span>
      {levelLabel(item.def, level)}
    </span>
  );
}

interface AchievementCardProps {
  item: AchievementItem;
  onOpen: () => void;
}

/** Cartão da grade: medalha, título, nível, progresso para o próximo nível e a data. */
export function AchievementCard({ item, onOpen }: AchievementCardProps) {
  const { def, achieved, progress } = item;
  const done = progress.nextLevel === null;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={achievementLabel(item)}
      data-achievement={def.id}
      className="flex h-full w-full flex-col gap-3 rounded-card-sm border-hair bg-surface p-4 text-left transition-colors hover:bg-hover"
    >
      <div className="flex items-start gap-3">
        <Medal def={def} level={achieved?.level ?? 0} />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-md font-semibold text-fg">{def.title}</span>
          <LevelTag item={item} />
        </div>
      </div>
      <div className="mt-auto flex flex-col gap-1.5">
        {!done && (
          <ProgressBar
            value={progress.value / progress.goal}
            aria-label={`Progresso de ${def.title}`}
          />
        )}
        {/* Nível único conquistado: o nível já diz “Conquistada”. */}
        {!(done && def.levels.length === 1) && (
          <span className="text-sm text-soft">{progressText(def, progress)}</span>
        )}
        {achieved && (
          <span className="text-sm text-muted">Desde {formatDate(unlockedAt(achieved))}</span>
        )}
      </div>
    </button>
  );
}
