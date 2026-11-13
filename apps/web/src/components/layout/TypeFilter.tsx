import { useState } from 'react';
import { ChevronDown, ListFilter } from 'lucide-react';
import { EVENT_TYPES, type EventType } from '@daily/shared';
import { cn } from '../../lib/cn';
import { EVENT_TYPE_META, TYPE_TEXT_CLASS } from '../../lib/event-meta';
import { useTypeFilter } from '../../lib/tasks/type-filter-store';
import { Button } from '../ui/Button';
import { Popover } from '../ui/Popover';

/** Texto do gatilho: “Todos os tipos”, “Provas” ou “2 tipos”. */
export function typeFilterLabel(types: ReadonlySet<EventType>): string {
  if (types.size === 0) return 'Todos os tipos';
  if (types.size === 1) return EVENT_TYPE_META[[...types][0]!].plural;
  return `${types.size} tipos`;
}

/** Lista de checkboxes com “Todos” e “Limpar” (no popover do desktop e no sheet do celular). */
function TypeFilterOptions() {
  const { types, toggle, clear } = useTypeFilter();
  return (
    <div className="flex min-w-filter flex-col gap-1 p-1">
      <fieldset className="flex flex-col gap-1">
        <legend className="sr-only">Tipos visíveis</legend>
        <label className="flex h-control-sm cursor-pointer items-center gap-3 rounded-md px-2 text-md hover:bg-hover coarse:h-touch">
          <input
            type="checkbox"
            checked={types.size === 0}
            onChange={clear}
            className="size-checkbox accent-accent"
          />
          Todos
        </label>
        {EVENT_TYPES.map((type) => {
          const meta = EVENT_TYPE_META[type];
          const Icon = meta.icon;
          return (
            <label
              key={type}
              className="flex h-control-sm cursor-pointer items-center gap-3 rounded-md px-2 text-md hover:bg-hover coarse:h-touch"
            >
              <input
                type="checkbox"
                checked={types.has(type)}
                onChange={() => toggle(type)}
                className="size-checkbox accent-accent"
              />
              <Icon
                aria-hidden
                strokeWidth={1.5}
                className={cn('size-icon-sm', TYPE_TEXT_CLASS[type])}
              />
              {meta.plural}
            </label>
          );
        })}
      </fieldset>
      <div className="mt-1 flex justify-end border-t-hair pt-2">
        <Button variant="secondary" onClick={clear} disabled={types.size === 0}>
          Limpar
        </Button>
      </div>
    </div>
  );
}

/**
 * Filtro global por tipo (Tarefa, Prova, Especial), multisseleção. Vale para o calendário e a
 * página Tarefas e fica salvo entre sessões. `compact`: só o ícone (topbar do celular).
 */
export function TypeFilter({ compact = false }: { compact?: boolean }) {
  const types = useTypeFilter((s) => s.types);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const label = typeFilterLabel(types);
  const active = types.size > 0;
  return (
    <>
      {compact ? (
        <span className="relative inline-flex">
          <Button
            variant="icon"
            size="sm"
            aria-label={`Filtrar por tipo: ${label}`}
            aria-haspopup="dialog"
            aria-expanded={anchor !== null}
            onClick={(e) => setAnchor(e.currentTarget)}
          >
            <ListFilter aria-hidden strokeWidth={1.5} className="size-icon" />
          </Button>
          {active && (
            <span aria-hidden className="absolute top-1 right-1 size-dot rounded-full bg-accent" />
          )}
        </span>
      ) : (
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={anchor !== null}
          aria-label={`Filtrar por tipo: ${label}`}
          onClick={(e) => setAnchor(e.currentTarget)}
          className={cn(
            'inline-flex h-select items-center gap-2 rounded-full bg-surface pr-3 pl-4 text-md font-medium',
            active ? 'text-fg' : 'text-soft',
          )}
        >
          <ListFilter aria-hidden strokeWidth={1.5} className="size-icon-sm" />
          {label}
          <ChevronDown aria-hidden strokeWidth={1.5} className="size-icon text-muted" />
        </button>
      )}
      {anchor && (
        <Popover anchor={anchor} onClose={() => setAnchor(null)} aria-label="Filtrar por tipo">
          <TypeFilterOptions />
        </Popover>
      )}
    </>
  );
}
