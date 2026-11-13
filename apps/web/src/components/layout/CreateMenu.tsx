import { FileCheck2, Library, ListTodo, Plus, Repeat, Sparkles } from 'lucide-react';
import { openEventForm, openHabitForm, openSubjectForm } from '../../lib/ui-store';
import { Button } from '../ui/Button';
import { Menu, type MenuItem } from '../ui/Menu';

/** Itens do menu “Criar” (também usados pelo botão + da agenda). */
export const CREATE_ITEMS: readonly MenuItem[] = [
  { label: 'Tarefa', icon: ListTodo, onSelect: () => openEventForm({ type: 'tarefa' }) },
  { label: 'Prova', icon: FileCheck2, onSelect: () => openEventForm({ type: 'prova' }) },
  { label: 'Especial', icon: Sparkles, onSelect: () => openEventForm({ type: 'especial' }) },
  { label: 'Hábito', icon: Repeat, onSelect: () => openHabitForm() },
  { label: 'Matéria', icon: Library, onSelect: () => openSubjectForm() },
];

/** Botão “Criar” da sidebar: abre o menu de entidades. */
export function CreateMenu({ collapsed }: { collapsed: boolean }) {
  return (
    <Menu
      label="Criar"
      items={CREATE_ITEMS}
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
