import { cn } from '../../lib/cn';

interface Option<T extends string> {
  value: T;
  label: string;
  /** Tecla de atalho (mostrada no tooltip e em `aria-keyshortcuts`). */
  shortcut?: string;
}

interface ActionItem {
  label: string;
  onClick: () => void;
}

interface SegmentedControlProps<T extends string> {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Ações (ex.: “Hoje”) exibidas no mesmo trilho, mas que nunca ficam selecionadas. */
  actions?: readonly ActionItem[];
  /** Itens mais justos (sem largura mínima), para barras de controles apertadas. */
  compact?: boolean;
  'aria-label': string;
}

const ITEM = 'h-full min-w-segment rounded-full px-4 text-md font-medium transition-colors';

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  actions = [],
  compact = false,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex h-control items-center gap-1 rounded-full bg-surface p-1"
    >
      <div role="radiogroup" aria-label={ariaLabel} className="contents">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-keyshortcuts={option.shortcut}
              title={option.shortcut ? `${option.label} (${option.shortcut})` : undefined}
              onClick={() => onChange(option.value)}
              className={cn(
                ITEM,
                compact && 'min-w-0! px-3!',
                active ? 'bg-accent font-semibold text-accent-fg' : 'text-soft hover:text-fg',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={action.onClick}
          className={cn(ITEM, 'text-soft hover:text-fg')}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
