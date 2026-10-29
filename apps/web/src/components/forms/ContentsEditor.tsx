import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { ContentRow } from '../../lib/forms/event-form';
import { Button } from '../ui/Button';

interface ContentsEditorProps {
  rows: ContentRow[];
  onChange: (rows: ContentRow[]) => void;
  error?: string | undefined;
}

/** Lista editável de conteúdos da prova: adicionar, renomear, remover e reordenar. */
export function ContentsEditor({ rows, onChange, error }: ContentsEditorProps) {
  const update = (index: number, patch: Partial<ContentRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index));
  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    const a = rows[index];
    const b = rows[target];
    if (!a || !b) return;
    onChange(rows.map((row, i) => (i === index ? b : i === target ? a : row)));
  };
  const add = () => onChange([...rows, { id: crypto.randomUUID(), title: '', done: false }]);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-base font-medium text-soft">Conteúdos</legend>
      {rows.length === 0 && (
        <p className="text-sm text-muted">Nenhum conteúdo ainda. Adicione os assuntos a estudar.</p>
      )}
      <ul className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <li key={row.id} className="flex items-center gap-1">
            <input
              aria-label={`Conteúdo ${index + 1}`}
              value={row.title}
              placeholder="Ex.: Derivadas"
              onChange={(e) => update(index, { title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && index === rows.length - 1) {
                  e.preventDefault();
                  add();
                }
              }}
              className="h-select min-w-0 flex-1 rounded-md border-hair bg-surface px-3 text-md text-fg placeholder:text-muted"
            />
            <Button
              variant="tile"
              size="xs"
              aria-label={`Mover conteúdo ${index + 1} para cima`}
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <ArrowUp aria-hidden strokeWidth={1.5} className="size-icon-sm" />
            </Button>
            <Button
              variant="tile"
              size="xs"
              aria-label={`Mover conteúdo ${index + 1} para baixo`}
              disabled={index === rows.length - 1}
              onClick={() => move(index, 1)}
            >
              <ArrowDown aria-hidden strokeWidth={1.5} className="size-icon-sm" />
            </Button>
            <Button
              variant="tile"
              size="xs"
              aria-label={`Remover conteúdo ${index + 1}`}
              onClick={() => remove(index)}
            >
              <Trash2 aria-hidden strokeWidth={1.5} className="size-icon-sm" />
            </Button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button variant="secondary" className="self-start" onClick={add}>
        <Plus aria-hidden strokeWidth={1.5} className="size-icon" />
        Adicionar conteúdo
      </Button>
    </fieldset>
  );
}
