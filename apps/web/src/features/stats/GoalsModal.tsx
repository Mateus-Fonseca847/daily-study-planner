import { useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, Archive, Plus } from 'lucide-react';
import { GOAL_ICONS, goalSchema, type Goal, type GoalIcon } from '@daily/shared';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { useData } from '../../lib/data/app-store';
import { GOAL_ICON_LABEL } from './goal-icons';

const ICON_OPTIONS = GOAL_ICONS.map((icon) => ({ value: icon, label: GOAL_ICON_LABEL[icon] }));

function GoalRow({
  goal,
  index,
  count,
  now,
  onMove,
}: {
  goal: Goal;
  index: number;
  count: number;
  now: Date;
  onMove: (delta: -1 | 1) => void;
}) {
  const updateGoal = useData((s) => s.updateGoal);
  const archiveGoal = useData((s) => s.archiveGoal);
  const [title, setTitle] = useState(goal.title);
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    const parsed = goalSchema.shape.title.safeParse(title);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Título inválido.');
      setTitle(goal.title);
      return;
    }
    setError(null);
    if (parsed.data !== goal.title) updateGoal(goal.id, { title: parsed.data });
  };

  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          aria-label={`Título da meta ${index + 1}`}
          value={title}
          maxLength={60}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
          }}
          className="h-select min-w-0 flex-1 rounded-md border-hair bg-surface px-3 text-md text-fg"
        />
        <Select
          aria-label={`Ícone da meta ${index + 1}`}
          value={goal.icon}
          options={ICON_OPTIONS}
          onChange={(e) => updateGoal(goal.id, { icon: e.target.value as GoalIcon })}
          className="w-32"
        />
        <Button
          variant="tile"
          size="xs"
          aria-label={`Mover “${goal.title}” para cima`}
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          <ArrowUp aria-hidden strokeWidth={1.5} className="size-icon-sm" />
        </Button>
        <Button
          variant="tile"
          size="xs"
          aria-label={`Mover “${goal.title}” para baixo`}
          disabled={index === count - 1}
          onClick={() => onMove(1)}
        >
          <ArrowDown aria-hidden strokeWidth={1.5} className="size-icon-sm" />
        </Button>
        <Button
          variant="tile"
          size="xs"
          aria-label={`Arquivar “${goal.title}”`}
          title="Arquivar"
          onClick={() => archiveGoal(goal.id, now)}
        >
          <Archive aria-hidden strokeWidth={1.5} className="size-icon-sm" />
        </Button>
      </div>
      {goal.kind !== 'manual' && (
        <p className="pl-1 text-xs text-muted">
          {goal.kind === 'auto-agua'
            ? 'Automática: cumprida ao atingir a meta de água.'
            : 'Automática: cumprida quando todos os blocos de estudo de hoje estão concluídos.'}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </li>
  );
}

/** Criar, renomear, reordenar e arquivar metas. */
export function GoalsModal({ now, onClose }: { now: Date; onClose: () => void }) {
  const goals = useData((s) => s.goals);
  const createGoal = useData((s) => s.createGoal);
  const reorderGoals = useData((s) => s.reorderGoals);
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState<GoalIcon>('target');
  const [error, setError] = useState<string | null>(null);

  const active = goals.filter((g) => g.archivedAt === null).sort((a, b) => a.order - b.order);

  const move = (index: number, delta: -1 | 1) => {
    const ids = active.map((g) => g.id);
    const target = index + delta;
    const a = ids[index];
    const b = ids[target];
    if (a === undefined || b === undefined) return;
    ids[index] = b;
    ids[target] = a;
    reorderGoals(ids);
  };

  const add = (e: FormEvent) => {
    e.preventDefault();
    const parsed = goalSchema.shape.title.safeParse(title);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Título inválido.');
      return;
    }
    setError(null);
    createGoal(now, { title: parsed.data, icon });
    setTitle('');
  };

  return (
    <Modal
      title="Gerenciar metas"
      onClose={onClose}
      footer={<Button onClick={onClose}>Concluir</Button>}
    >
      <div className="flex flex-col gap-5 pb-2">
        {active.length === 0 ? (
          <p className="text-md text-muted">Nenhuma meta ativa.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {active.map((goal, index) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                index={index}
                count={active.length}
                now={now}
                onMove={(delta) => move(index, delta)}
              />
            ))}
          </ul>
        )}

        <form onSubmit={add} noValidate className="flex flex-col gap-2 border-t-hair pt-4">
          <div className="flex items-center gap-2">
            <input
              aria-label="Nova meta"
              placeholder="Nova meta (ex.: Ler 20 páginas)"
              value={title}
              maxLength={60}
              onChange={(e) => setTitle(e.target.value)}
              className="h-select min-w-0 flex-1 rounded-md border-hair bg-surface px-3 text-md text-fg placeholder:text-muted"
            />
            <Select
              aria-label="Ícone da nova meta"
              value={icon}
              options={ICON_OPTIONS}
              onChange={(e) => setIcon(e.target.value as GoalIcon)}
              className="w-32"
            />
            <Button type="submit" variant="secondary">
              <Plus aria-hidden strokeWidth={1.5} className="size-icon" />
              Adicionar
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </form>
        <p className="text-xs text-muted">
          Metas arquivadas deixam de valer a partir do dia do arquivamento; o histórico e a
          sequência dos dias anteriores não mudam.
        </p>
      </div>
    </Modal>
  );
}
