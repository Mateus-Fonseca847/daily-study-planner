import { BookOpen, FileCheck2, Library, ListChecks, Plus } from 'lucide-react';
import { openEventForm, openSubjectForm } from '../../lib/ui-store';
import { Button } from '../ui/Button';
import { Menu, type MenuItem } from '../ui/Menu';

const ITEMS: readonly MenuItem[] = [
  { label: 'Prova', icon: FileCheck2, onSelect: () => openEventForm({ type: 'prova' }) },
  { label: 'Tarefa', icon: ListChecks, onSelect: () => openEventForm({ type: 'entrega' }) },
  { label: 'Bloco de estudo', icon: BookOpen, onSelect: () => openEventForm({ type: 'estudo' }) },
  { label: 'Matéria', icon: Library, onSelect: () => openSubjectForm() },
];

/** Botão “Criar” da sidebar: abre o menu de entidades. */
export function CreateMenu({ collapsed }: { collapsed: boolean }) {
  return (
    <Menu
      label="Criar"
      items={ITEMS}
      trigger={(props) =>
        collapsed ? (
          <Button
            variant="icon"
            size="md"
            aria-label="Criar"
            className="bg-pill! text-pill-fg!"
            {...props}
          >
            <Plus aria-hidden strokeWidth={1.5} className="size-icon" />
          </Button>
        ) : (
          <Button variant="pill" {...props}>
            <Plus aria-hidden strokeWidth={1.5} className="size-icon" />
            Criar
          </Button>
        )
      }
    />
  );
}
