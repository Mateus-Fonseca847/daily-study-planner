import { useMemo } from 'react';
import type { StudyEvent } from '@daily/shared';
import { weekRange } from '../lib/views';
import { TimeGridView } from './TimeGridView';

interface WeekViewProps {
  date: string;
  events: readonly StudyEvent[];
  selectedId: string | null;
  onSelect: (event: StudyEvent, anchor: HTMLElement) => void;
  onCreateAt: (date: string, time: string) => void;
  onCreateDay: (date: string) => void;
}

/** Visão Semana: 7 colunas (DOM–SÁB), faixa de hábitos e grade de horas. */
export function WeekView({ date, ...rest }: WeekViewProps) {
  const days = useMemo(() => weekRange(date).days, [date]);
  return <TimeGridView variant="semana" days={days} {...rest} />;
}
