import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Habit, StudyEvent } from '@daily/shared';
import { cn } from '../../../lib/cn';
import { useData } from '../../../lib/data/app-store';
import { parseDayKey } from '../../../lib/dates';
import { targetOn, valueOn } from '../../../lib/habits';
import { nextHabitValue } from '../../../lib/habits/edit';
import { WEEKDAY_LABELS } from '../../../lib/habits/repeat';
import { useHabitModel } from '../../habits/useHabitModel';
import { buildGridColumns, untimedHabits } from '../lib/grid-items';
import { EventBlock, HabitBlock } from './TimeBlock';
import { HabitPill } from './HabitPill';
import { TimeGrid } from './TimeGrid';

interface TimeGridViewProps {
  /** Dias das colunas (7 na Semana, 1 no Dia). */
  days: readonly string[];
  events: readonly StudyEvent[];
  /** Cabeçalho por coluna (dia da semana e número) e faixa “Hábitos” (Semana). */
  variant: 'semana' | 'dia';
  selectedId: string | null;
  onSelect: (event: StudyEvent, anchor: HTMLElement) => void;
  /** Criar evento num dia e horário (`yyyy-MM-dd`, `HH:mm`) ou só num dia (cabeçalho). */
  onCreateAt: (date: string, time: string) => void;
  onCreateDay: (date: string) => void;
}

/** Dia da semana e número do dia no cabeçalho da coluna; o número cria um evento naquele dia. */
function ColumnHeader({
  date,
  today,
  onCreateDay,
}: {
  date: string;
  today: string;
  onCreateDay: (date: string) => void;
}) {
  const day = parseDayKey(date);
  const isToday = date === today;
  const label = format(day, "EEEE, d 'de' MMMM", { locale: ptBR });
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs font-bold uppercase tracking-label text-fg">
        {WEEKDAY_LABELS[day.getDay()]}
      </span>
      <button
        type="button"
        aria-label={`Criar evento em ${label}`}
        aria-current={isToday ? 'date' : undefined}
        onClick={() => onCreateDay(date)}
        className={cn(
          'inline-flex h-today min-w-today items-center justify-center rounded-full px-1 text-md font-bold',
          isToday ? 'bg-accent text-accent-fg' : 'text-soft hover:text-fg',
        )}
      >
        {day.getDate()}
      </button>
    </div>
  );
}

/** Grade de horas com eventos e hábitos (Semana e Dia), ligada aos dados e ao relógio. */
export function TimeGridView({
  days,
  events,
  variant,
  selectedId,
  onSelect,
  onCreateAt,
  onCreateDay,
}: TimeGridViewProps) {
  const { now, today, habits, ctx } = useHabitModel();
  const setHabitValue = useData((s) => s.setHabitValue);
  const { columns, range } = useMemo(
    () => buildGridColumns(days, events, habits, ctx),
    [days, events, habits, ctx],
  );
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const toggle = (habit: Habit, date: string) =>
    setHabitValue(
      habit.id,
      date,
      nextHabitValue(habit, valueOn(habit, date, ctx), targetOn(habit, date)),
      now,
    );

  const week = variant === 'semana';
  return (
    <TimeGrid
      columns={columns}
      range={range}
      today={today}
      nowMin={nowMin}
      ariaLabel={week ? 'Calendário semanal' : 'Calendário do dia'}
      minWidthClass={week ? 'min-w-week-min' : ''}
      {...(week
        ? {
            renderHeader: (date: string) => (
              <ColumnHeader date={date} today={today} onCreateDay={onCreateDay} />
            ),
            stripLabel: 'Hábitos',
            renderStrip: (date: string) => (
              <div className="flex flex-wrap gap-1">
                {untimedHabits(habits, date, ctx).map((habit) => (
                  <HabitPill key={habit.id} habit={habit} date={date} ctx={ctx} onToggle={toggle} />
                ))}
              </div>
            ),
          }
        : {})}
      onCreateAt={onCreateAt}
      renderItem={(item, date) =>
        item.kind === 'event' ? (
          <EventBlock item={item} selected={selectedId === item.event.id} onSelect={onSelect} />
        ) : (
          <HabitBlock item={item} date={date} ctx={ctx} onToggle={toggle} />
        )
      }
    />
  );
}
