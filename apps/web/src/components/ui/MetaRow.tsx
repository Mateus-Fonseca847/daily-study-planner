import { ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { ReactNode } from 'react';

interface MetaRowProps {
  icon: LucideIcon;
  label: string;
  /** Com `htmlFor`, o rótulo vira `<label>` do controle. */
  htmlFor?: string;
  children: ReactNode;
}

/** Linha de metadado dos painéis (tarefa e hábito): ícone, rótulo e controle; empilha no celular. */
export function MetaRow({ icon: Icon, label, htmlFor, children }: MetaRowProps) {
  const LabelTag = htmlFor ? 'label' : 'span';
  return (
    <div className="flex items-start gap-3 phone:flex-col phone:gap-1">
      <LabelTag
        {...(htmlFor ? { htmlFor } : {})}
        className="flex h-field w-panel-label shrink-0 items-center gap-2 text-base text-muted phone:h-auto"
      >
        <Icon aria-hidden strokeWidth={1.5} className="size-icon-sm" />
        {label}
      </LabelTag>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/** Botão “Mais opções” (recolhe o que não é essencial na criação). */
export function MoreOptionsToggle({
  open,
  controls,
  onToggle,
}: {
  open: boolean;
  controls: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
      className="inline-flex h-control-sm items-center gap-1 self-start rounded-full px-2 text-sm font-medium text-soft hover:text-fg coarse:h-touch"
    >
      <ChevronDown
        aria-hidden
        strokeWidth={1.5}
        className={cn('size-icon-sm transition-transform', open && 'rotate-180')}
      />
      Mais opções
    </button>
  );
}
