import { useMemo } from 'react';
import type { StudyEvent } from '@daily/shared';
import { useHabitModel } from '../../habits/useHabitModel';
import { dayHeading } from '../lib/views';
import { DayPanel } from './DayPanel';
import { TimeGridView } from './TimeGridView';

interface DayViewProps {
  date: string;
  events: readonly StudyEvent[];
  selectedId: string | null;
  onSelect: (event: StudyEvent, anchor: HTMLElement) => void;
  onCreateAt: (date: string, time: string) => void;
}

/**
 * Visão Dia (“Hoje”): grade de uma coluna larga e, ao lado, o painel com hábitos, próxima prova e
 * tarefas do dia. Abaixo de 1100 px o painel vai para cima da grade.
 */
export function DayView({ date, events, selectedId, onSelect, onCreateAt }: DayViewProps) {
  const { now, today, habits, ctx } = useHabitModel();
  const days = useMemo(() => [date], [date]);
  return (
    <div className="day-layout min-h-0 flex-1 overflow-y-auto">
      <aside className="day-panel-slot shrink-0 border-b-hair">
        <DayPanel date={date} today={today} now={now} events={events} habits={habits} ctx={ctx} />
      </aside>
      <div className="day-grid-slot flex min-h-0 min-w-0 flex-1 flex-col">
        <h2 className="shrink-0 px-page pt-4 pb-2 text-lg font-semibold tracking-tight">
          {dayHeading(date, today)}
        </h2>
        <TimeGridView
          variant="dia"
          days={days}
          events={events}
          selectedId={selectedId}
          onSelect={onSelect}
          onCreateAt={onCreateAt}
          onCreateDay={() => undefined}
        />
      </div>
    </div>
  );
}
