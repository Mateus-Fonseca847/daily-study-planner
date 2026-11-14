import { X } from 'lucide-react';
import type { StudyEvent } from '@daily/shared';
import { cn } from '../../lib/cn';
import {
  completeControl,
  type ChipSize,
  type ControlVisibility,
} from '../../lib/tasks/complete-control';
import { CompleteButton } from './CompleteButton';

/** Classes de cada visibilidade (mapa literal: nada de classe montada por template). */
const VISIBILITY_CLASS: Record<ControlVisibility, string> = {
  always: 'mr-1',
  pointer: 'mr-1 coarse:hidden',
  reveal:
    'absolute top-0.5 right-0.5 bg-raised opacity-0 group-hover/chip:opacity-100 focus-visible:opacity-100 coarse:hidden',
  none: 'hidden',
};

interface ChipCompleteProps {
  event: Pick<StudyEvent, 'id' | 'title' | 'status' | 'type'>;
  size: ChipSize;
}

/**
 * Controle de concluir dos chips e blocos do calendário (irmão do botão que abre o painel). A
 * regra de quando e como aparece é `completeControl` (lib/tasks/complete-control.ts).
 */
export function ChipComplete({ event, size }: ChipCompleteProps) {
  const control = completeControl(event, size);
  if (control.kind === 'none') return null;
  const visibility = VISIBILITY_CLASS[control.visibility];
  if (control.kind === 'cancelled') {
    return (
      <span
        aria-hidden
        title="Cancelada"
        className={cn(
          'inline-flex size-check-target shrink-0 items-center justify-center text-cancelado',
          visibility,
        )}
      >
        <X strokeWidth={3} className="size-icon-sm" />
      </span>
    );
  }
  return <CompleteButton event={event} className={visibility} />;
}
