import { Check } from 'lucide-react';
import type { StudyEvent } from '@daily/shared';
import { cn } from '../../lib/cn';
import { toggleDoneWithUndo } from '../../lib/data/actions';

interface CompleteButtonProps {
  event: Pick<StudyEvent, 'id' | 'title' | 'status'>;
  className?: string;
}

/**
 * Concluir com um clique (chips, linhas e painel). Alvo de 24 px no mouse e 44 px no toque.
 * Concluída: círculo verde com check; cancelada: sem ação (reabrir fica no painel).
 */
export function CompleteButton({ event, className }: CompleteButtonProps) {
  const done = event.status === 'concluido';
  const cancelled = event.status === 'cancelado';
  return (
    <button
      type="button"
      data-touch="dense"
      aria-pressed={done}
      disabled={cancelled}
      aria-label={done ? `Reabrir “${event.title}”` : `Concluir “${event.title}”`}
      title={done ? 'Reabrir' : 'Concluir'}
      onClick={(e) => {
        e.stopPropagation();
        toggleDoneWithUndo(event.id);
      }}
      className={cn(
        'group inline-flex size-check-target shrink-0 items-center justify-center rounded-full coarse:size-touch',
        cancelled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-flex size-checkbox items-center justify-center rounded-full border-hair transition-colors',
          done
            ? 'border-concluido bg-concluido text-on-status'
            : 'border-line-strong text-transparent group-hover:border-concluido group-hover:text-concluido',
        )}
      >
        <Check strokeWidth={3} className="size-icon-sm" />
      </span>
    </button>
  );
}
