import { Check } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  /** Sem texto riscado quando marcado (para opções, não para listas de tarefas). */
  plain?: boolean;
}

export function Checkbox({ label, checked, plain = false, ...rest }: CheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-base">
      <span className="relative inline-flex">
        <input type="checkbox" checked={checked} className="peer sr-only" {...rest} />
        <span className="inline-flex size-checkbox items-center justify-center rounded-sm border-hair border-line-strong peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
          {checked && <Check aria-hidden strokeWidth={3} className="size-icon-sm text-accent-fg" />}
        </span>
      </span>
      <span className={checked && !plain ? 'text-muted line-through' : 'text-fg'}>{label}</span>
    </label>
  );
}
