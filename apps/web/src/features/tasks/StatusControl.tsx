import { EVENT_STATUSES, type EventStatus } from '@daily/shared';
import { cn } from '../../lib/cn';
import { EVENT_STATUS_META } from '../../lib/event-meta';

/** Classes literais do item ativo de cada status (cor reservada + ícone + texto). */
const ACTIVE: Record<EventStatus, string> = {
  pendente: 'bg-pendente-soft text-pendente border-pendente',
  concluido: 'bg-concluido-soft text-concluido border-concluido',
  cancelado: 'bg-cancelado-soft text-cancelado border-cancelado',
};

interface StatusControlProps {
  value: EventStatus;
  onChange: (status: EventStatus) => void;
  id?: string;
}

/** Controle de 3 opções (Pendente, Concluído, Cancelado), com teclado de radiogroup nativo. */
export function StatusControl({ value, onChange, id }: StatusControlProps) {
  return (
    <div id={id} role="radiogroup" aria-label="Status" className="flex flex-wrap gap-1">
      {EVENT_STATUSES.map((status) => {
        const meta = EVENT_STATUS_META[status];
        const Icon = meta.icon;
        const active = status === value;
        return (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(status)}
            className={cn(
              'inline-flex h-control-sm items-center gap-1.5 rounded-full border-hair px-3 text-sm font-medium transition-colors coarse:h-touch',
              active ? ACTIVE[status] : 'border-line text-soft hover:text-fg',
            )}
          >
            <Icon aria-hidden strokeWidth={1.75} className="size-icon-sm" />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
