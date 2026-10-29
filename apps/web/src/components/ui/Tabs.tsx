import { useId, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface Tab<T extends string> {
  value: T;
  label: string;
}

interface TabsProps<T extends string> {
  tabs: readonly Tab<T>[];
  value: T;
  onChange: (value: T) => void;
  'aria-label': string;
  children: ReactNode;
}

/** Abas com setas esquerda/direita; o painel ativo vem em `children`. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  children,
  'aria-label': ariaLabel,
}: TabsProps<T>) {
  const base = useId();
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = tabs[(index + step + tabs.length) % tabs.length];
    if (!next) return;
    onChange(next.value);
    document.getElementById(`${base}-tab-${next.value}`)?.focus();
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="inline-flex h-control items-center gap-1 self-start rounded-full bg-surface p-1"
      >
        {tabs.map((tab, index) => {
          const active = tab.value === value;
          return (
            <button
              key={tab.value}
              id={`${base}-tab-${tab.value}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`${base}-panel`}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(tab.value)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={cn(
                'h-full min-w-segment rounded-full px-4 text-md font-medium transition-colors',
                active ? 'bg-accent font-semibold text-accent-fg' : 'text-soft hover:text-fg',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div id={`${base}-panel`} role="tabpanel" aria-labelledby={`${base}-tab-${value}`}>
        {children}
      </div>
    </div>
  );
}
