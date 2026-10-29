import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
}

interface TriggerProps {
  'aria-haspopup': 'menu';
  'aria-expanded': boolean;
  'aria-controls': string;
  onClick: () => void;
}

interface MenuProps {
  items: readonly MenuItem[];
  label: string;
  /** Renderiza o botão que abre o menu. */
  trigger: (props: TriggerProps) => ReactNode;
  /** Alinha o painel à borda direita do gatilho (padrão: esquerda). */
  align?: 'start' | 'end';
}

/**
 * Menu suspenso (role="menu"): setas, Home/End, Esc, Tab e clique fora.
 * O painel fica ao lado do gatilho no DOM (sem portal), então vale dentro de popovers.
 */
export function Menu({ items, label, trigger, align = 'start' }: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) rootRef.current?.querySelector<HTMLElement>('[aria-haspopup]')?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const nodes = [...(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const index = nodes.indexOf(document.activeElement as HTMLElement);
    const focusAt = (i: number) => nodes[(i + nodes.length) % nodes.length]?.focus();
    switch (e.key) {
      case 'Escape':
        e.stopPropagation(); // fecha só o menu, não o popover/modal que o contém
        close(true);
        break;
      case 'ArrowDown':
        e.preventDefault();
        focusAt(index + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusAt(index - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusAt(0);
        break;
      case 'End':
        e.preventDefault();
        focusAt(nodes.length - 1);
        break;
      case 'Tab':
        close(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className="relative inline-flex" onKeyDown={onKeyDown}>
      {trigger({
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': panelId,
        onClick: () => setOpen((v) => !v),
      })}
      {open && (
        <ul
          id={panelId}
          role="menu"
          aria-label={label}
          className={`absolute top-full z-50 mt-1 w-menu rounded-lg border-hair bg-raised p-1 shadow-popover ${
            align === 'end' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map(({ label: itemLabel, icon: Icon, onSelect }) => (
            <li key={itemLabel} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  close(false);
                  onSelect();
                }}
                className="flex h-select w-full items-center gap-2 rounded-md px-3 text-left text-md text-fg hover:bg-hover focus-visible:bg-hover"
              >
                {Icon && <Icon aria-hidden strokeWidth={1.5} className="size-icon text-muted" />}
                {itemLabel}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
