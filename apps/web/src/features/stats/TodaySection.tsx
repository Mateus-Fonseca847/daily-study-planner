import { useMemo } from 'react';
import { useData } from '../../lib/data/app-store';
import {
  computeStreaks,
  examPrep,
  goalsSummary,
  nextExam,
  studyHoursByDay,
  waterOn,
  weekDays,
} from '../../lib/stats/derive';
import { AgendaCard } from './AgendaCard';
import { GoalsCard } from './GoalsCard';
import { HoursCard } from './HoursCard';
import { PrepCard } from './PrepCard';
import { StreakPill } from './StreakPill';
import type { StatsModel } from './useStatsModel';
import { WaterCard } from './WaterCard';

/** Seção “Hoje”: grid de 4 colunas da referência (semana, preparação, sequência+água, metas, agenda). */
export function TodaySection({ now, today, index }: StatsModel) {
  const subjects = useData((s) => s.subjects);
  const { events, preferences } = index.data;

  const week = useMemo(() => studyHoursByDay(events, weekDays(today)), [events, today]);
  const exam = useMemo(() => nextExam(events, now), [events, now]);
  const streaks = useMemo(() => computeStreaks(index, today), [index, today]);
  const goals = useMemo(() => goalsSummary(index, today), [index, today]);
  const subjectName = subjects.find((s) => s.id === exam?.subjectId)?.name;

  return (
    <div className="grid-stats">
      <HoursCard days={week} today={today} />
      <PrepCard prep={exam ? examPrep(exam) : undefined} subjectName={subjectName} now={now} />
      <div className="flex min-h-0 min-w-0 flex-col gap-card-gap">
        <StreakPill current={streaks.current} best={streaks.best} />
        <WaterCard
          ml={waterOn(index, today)}
          goalMl={preferences.waterGoalMl}
          cupMl={preferences.cupMl}
          now={now}
        />
      </div>
      <div className="xl:row-span-2">
        <GoalsCard summary={goals} today={today} now={now} />
      </div>
      <div className="col-span-2 xl:col-span-3">
        <AgendaCard events={events} subjects={subjects} today={today} now={now} />
      </div>
    </div>
  );
}
