import { Flame } from 'lucide-react';
import { formatDays } from '../../lib/stats/format';

/** Pílula amarela com a sequência de dias seguidos com todos os hábitos agendados cumpridos. */
export function StreakPill({ current, best }: { current: number; best: number }) {
  return (
    <div
      role="group"
      aria-label={`Sequência atual: ${formatDays(current)}. Melhor sequência: ${formatDays(best)}.`}
      className="flex h-stats-pill shrink-0 items-center justify-center gap-3 rounded-card bg-accent px-card text-accent-fg"
    >
      <Flame aria-hidden strokeWidth={1.5} className="size-avatar-md" />
      <span className="flex flex-col leading-tight">
        <span className="text-xs">Sequência</span>
        <span className="text-card-title font-semibold tabular-nums">{formatDays(current)}</span>
      </span>
    </div>
  );
}
