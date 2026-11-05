import { useState } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import type { Habit } from '@daily/shared';
import type { MenuItem } from '../../components/ui/Menu';
import { useData } from '../../lib/data/app-store';
import type { HabitContext } from '../../lib/habits';
import { activePosition, moveActiveHabit, stepActiveHabit } from '../../lib/habits/order';
import { HabitCard } from './HabitCard';

interface SortableHabitsProps {
  /** Todos os hábitos, em ordem (os arquivados entram só para manter seus lugares). */
  habits: readonly Habit[];
  ctx: HabitContext;
  now: Date;
  from: string;
  to: string;
}

const INSTRUCTIONS =
  'Para reordenar, pressione espaço para pegar o hábito, use as setas para cima e para baixo para mover, espaço para soltar ou Esc para cancelar.';

/** Só o eixo vertical: o cartão acompanha o ponteiro para cima e para baixo. */
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

const moved = (name: string, position: number, total: number) =>
  `${name} movido para a posição ${position} de ${total}`;

/** Lista de cartões de `/habitos` que se reordena pela alça (mouse, toque e teclado) ou pelo menu “...”. */
export function SortableHabits({ habits, ctx, now, from, to }: SortableHabitsProps) {
  const reorderHabits = useData((s) => s.reorderHabits);
  const [announcement, setAnnouncement] = useState('');
  const active = habits.filter((h) => h.archivedAt === null);
  const ids = active.map((h) => h.id);
  const nameOf = (id: unknown) => active.find((h) => h.id === id)?.name ?? '';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const commit = (id: string, order: string[] | null, message: string) => {
    if (order) reorderHabits(order);
    setAnnouncement(message);
    return id;
  };

  const onDragEnd = ({ active: dragged, over }: DragEndEvent) => {
    if (!over || dragged.id === over.id) return;
    const id = String(dragged.id);
    const order = moveActiveHabit(habits, id, ids.indexOf(String(over.id)));
    commit(id, order, moved(nameOf(id), ids.indexOf(String(over.id)) + 1, ids.length));
  };

  const announcements: Announcements = {
    onDragStart: ({ active: a }) =>
      `${nameOf(a.id)} pego, posição ${ids.indexOf(String(a.id)) + 1} de ${ids.length}.`,
    onDragOver: ({ active: a, over }) =>
      over ? moved(nameOf(a.id), ids.indexOf(String(over.id)) + 1, ids.length) : undefined,
    onDragEnd: ({ active: a, over }) =>
      `${nameOf(a.id)} solto na posição ${(over ? ids.indexOf(String(over.id)) : ids.indexOf(String(a.id))) + 1} de ${ids.length}.`,
    onDragCancel: ({ active: a }) =>
      `Reordenação cancelada. ${nameOf(a.id)} continua na posição ${ids.indexOf(String(a.id)) + 1} de ${ids.length}.`,
  };

  const moveItems = (id: string): MenuItem[] => {
    const step = (direction: -1 | 1) => () => {
      const order = stepActiveHabit(habits, id, direction);
      if (!order) return;
      const next = order.filter((x) => ids.includes(x));
      commit(id, order, moved(nameOf(id), next.indexOf(id) + 1, ids.length));
    };
    const position = activePosition(habits, id) ?? 0;
    return [
      ...(position > 1 ? [{ label: 'Mover para cima', icon: ArrowUp, onSelect: step(-1) }] : []),
      ...(position < ids.length
        ? [{ label: 'Mover para baixo', icon: ArrowDown, onSelect: step(1) }]
        : []),
    ];
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[verticalOnly]}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: INSTRUCTIONS },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-4">
          {active.map((habit) => (
            <SortableCard
              key={habit.id}
              habit={habit}
              ctx={ctx}
              now={now}
              from={from}
              to={to}
              moveItems={moveItems(habit.id)}
            />
          ))}
        </div>
      </SortableContext>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </DndContext>
  );
}

interface SortableCardProps {
  habit: Habit;
  ctx: HabitContext;
  now: Date;
  from: string;
  to: string;
  moveItems: MenuItem[];
}

function SortableCard({ habit, moveItems, ...rest }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id });

  return (
    <HabitCard
      habit={habit}
      {...rest}
      sortable={{
        rootRef: setNodeRef,
        rootStyle: { transform: CSS.Translate.toString(transform), transition },
        dragging: isDragging,
        moveItems,
        handle: (
          <button
            type="button"
            ref={setActivatorNodeRef}
            aria-label={`Reordenar ${habit.name}`}
            className="drag-handle inline-flex size-control shrink-0 items-center justify-center rounded-full text-soft hover:text-fg coarse:size-touch"
            {...attributes}
            {...listeners}
          >
            <GripVertical aria-hidden strokeWidth={1.5} className="size-icon" />
          </button>
        ),
      }}
    />
  );
}
