import { Bell, Focus, Search } from 'lucide-react';
import { Button } from '../ui/Button';
import { SubjectSelect } from './SubjectSelect';

interface TopbarProps {
  subjectId: string;
  onSubjectChange: (id: string) => void;
}

export function Topbar({ subjectId, onSubjectChange }: TopbarProps) {
  return (
    <header className="flex h-topbar shrink-0 items-center pt-3 justify-between border-b-hair px-page">
      <SubjectSelect value={subjectId} onChange={onSubjectChange} />
      <div className="flex items-center gap-2">
        <Button variant="icon" aria-label="Buscar">
          <Search aria-hidden strokeWidth={1.5} className="size-icon" />
        </Button>
        <Button variant="icon" aria-label="Notificações">
          <Bell aria-hidden strokeWidth={1.5} className="size-icon" />
        </Button>
        <Button variant="secondary">
          Modo Foco
          <Focus aria-hidden strokeWidth={1.5} className="size-icon" />
        </Button>
      </div>
    </header>
  );
}
