import { ChevronDown } from 'lucide-react';
import type { SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectGroup {
  label: string;
  options: readonly SelectOption[];
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: readonly SelectOption[];
  /** Grupos (`<optgroup>`) exibidos depois das opções soltas. */
  groups?: readonly SelectGroup[];
  'aria-label': string;
}

const renderOption = (o: SelectOption) => (
  <option key={o.value} value={o.value}>
    {o.label}
  </option>
);

/** `<select>` nativo (teclado e leitores de tela de graça) com aparência do design system. */
export function Select({ options, groups = [], className, ...rest }: SelectProps) {
  return (
    <div className={cn('relative inline-flex', className)}>
      <select
        className="h-select w-full appearance-none rounded-md border-hair bg-surface pr-8 pl-3 text-md text-fg"
        {...rest}
      >
        {options.map(renderOption)}
        {groups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map(renderOption)}
          </optgroup>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        strokeWidth={1.5}
        className="pointer-events-none absolute top-1/2 right-2.5 size-icon -translate-y-1/2 text-muted"
      />
    </div>
  );
}
