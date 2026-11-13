import { Flame } from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatDays } from '../../lib/stats/format';

/**
 * Chama de sequência de um hábito: laranja (token próprio, a única exceção laranja do sistema)
 * com sequência > 0; cinza quando é zero. O número sempre acompanha o ícone.
 */
export function StreakFlame({ days, className }: { days: number; className?: string }) {
  const on = days > 0;
  return (
    <span
      role="img"
      aria-label={`Sequência: ${formatDays(days)}`}
      title={`Sequência: ${formatDays(days)}`}
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold tabular-nums',
        on ? 'text-streak' : 'text-streak-off',
        className,
      )}
    >
      <Flame
        aria-hidden
        strokeWidth={1.75}
        className="size-icon-sm"
        fill={on ? 'currentColor' : 'none'}
      />
      {days}
    </span>
  );
}
