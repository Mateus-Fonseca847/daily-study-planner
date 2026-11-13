import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { MoveDirection } from '../../lib/data/subtasks';

export interface SubtaskItem {
  id: string;
  title: string;
  done: boolean;
}

interface SubtaskListProps {
  /** “Conteúdos” numa prova, “Subtarefas” nos demais tipos. */
  label: string;
  items: readonly SubtaskItem[];
  onAdd: (title: string) => void;
  onToggle: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: MoveDirection) => void;
  error?: string | undefined;
}

const ICON_BTN =
  'inline-flex size-check-target shrink-0 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-fg disabled:opacity-40 disabled:hover:bg-transparent coarse:size-touch';

/** Lista de subtarefas: marcar, renomear (direto no campo), reordenar por botões e excluir. */
export function SubtaskList({
  label,
  items,
  onAdd,
  onToggle,
  onRename,
  onDelete,
  onMove,
  error,
}: SubtaskListProps) {
  const [draft, setDraft] = useState('');
  const exam = label === 'Conteúdos';
  const singular = exam ? 'conteúdo' : 'subtarefa';
  const newLabel = exam ? 'Novo conteúdo' : 'Nova subtarefa';
  // Sem <form>: a lista vive dentro do formulário do painel (formulários não podem se aninhar).
  const add = () => {
    const title = draft.trim();
    if (!title) return;
    onAdd(title);
    setDraft('');
  };
  return (
    <section aria-label={label} className="flex flex-col gap-1">
      <ul className="flex flex-col gap-1">
        {items.map((item, index) => (
          <li key={item.id} className="flex items-center gap-1 rounded-md px-1 hover:bg-hover">
            <button
              type="button"
              role="checkbox"
              aria-checked={item.done}
              aria-label={`Marcar “${item.title}”`}
              data-touch="dense"
              onClick={() => onToggle(item.id)}
              className="inline-flex size-check-target shrink-0 items-center justify-center coarse:size-touch"
            >
              <span
                aria-hidden
                className={cn(
                  'inline-flex size-checkbox items-center justify-center rounded-sm border-hair',
                  item.done ? 'border-concluido bg-concluido' : 'border-line-strong',
                )}
              >
                {item.done && <Check strokeWidth={3} className="size-icon-sm text-accent-fg" />}
              </span>
            </button>
            <input
              aria-label={`Título de “${item.title}”`}
              defaultValue={item.title}
              maxLength={120}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value && value !== item.title) onRename(item.id, value);
                else e.target.value = item.title;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              className={cn(
                'h-field min-w-0 flex-1 rounded-md bg-transparent px-1 text-base text-fg',
                item.done && 'text-muted line-through',
              )}
            />
            <button
              type="button"
              className={ICON_BTN}
              aria-label={`Subir “${item.title}”`}
              disabled={index === 0}
              onClick={() => onMove(item.id, 'up')}
            >
              <ArrowUp aria-hidden strokeWidth={1.5} className="size-icon-sm" />
            </button>
            <button
              type="button"
              className={ICON_BTN}
              aria-label={`Descer “${item.title}”`}
              disabled={index === items.length - 1}
              onClick={() => onMove(item.id, 'down')}
            >
              <ArrowDown aria-hidden strokeWidth={1.5} className="size-icon-sm" />
            </button>
            <button
              type="button"
              className={ICON_BTN}
              aria-label={`Excluir “${item.title}”`}
              onClick={() => onDelete(item.id)}
            >
              <Trash2 aria-hidden strokeWidth={1.5} className="size-icon-sm" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-1">
        <input
          aria-label={newLabel}
          placeholder={`Adicionar ${singular}`}
          value={draft}
          maxLength={120}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          className="h-field min-w-0 flex-1 rounded-md bg-hover px-2 text-base text-fg placeholder:text-muted"
        />
        <button
          type="button"
          className={ICON_BTN}
          aria-label={`Adicionar ${singular}`}
          onClick={add}
        >
          <Plus aria-hidden strokeWidth={1.5} className="size-icon-sm" />
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </section>
  );
}
