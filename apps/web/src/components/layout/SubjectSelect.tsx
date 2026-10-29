import { ChevronDown } from 'lucide-react';
import { useData } from '../../lib/data/app-store';
import { Avatar } from '../ui/Avatar';

interface SubjectSelectProps {
  value: string;
  onChange: (id: string) => void;
}

const ALL = { id: 'all', name: 'Todas as matérias' };

export function SubjectSelect({ value, onChange }: SubjectSelectProps) {
  const subjects = useData((s) => s.subjects);
  const options = [ALL, ...subjects];
  const current = options.find((o) => o.id === value) ?? ALL;
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex size-control items-center justify-center rounded-full bg-surface">
        <Avatar name={current.name} size="md" />
      </span>
      <div className="relative inline-flex w-course items-center">
        <select
          aria-label="Matéria"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-select w-full appearance-none rounded-full bg-surface pr-9 pl-4 text-md font-medium text-soft"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          strokeWidth={1.5}
          className="pointer-events-none absolute right-3 size-icon text-muted"
        />
      </div>
    </div>
  );
}
