import { ChevronDown } from 'lucide-react';
import { SUBJECTS } from '../../mocks/subjects';
import { Avatar } from '../ui/Avatar';

interface SubjectSelectProps {
  value: string;
  onChange: (id: string) => void;
}

const ALL = { id: 'all', name: 'Todas as matérias' };

export function SubjectSelect({ value, onChange }: SubjectSelectProps) {
  const options = [ALL, ...SUBJECTS];
  const current = options.find((o) => o.id === value) ?? ALL;
  return (
    <div className="relative inline-flex w-course items-center">
      <span className="pointer-events-none absolute left-2">
        <Avatar name={current.name} />
      </span>
      <select
        aria-label="Matéria"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-control w-full appearance-none rounded-full border-hair bg-surface pr-9 pl-11 text-md font-medium text-fg"
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
  );
}
