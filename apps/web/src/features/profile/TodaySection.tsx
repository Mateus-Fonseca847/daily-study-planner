import { useMemo } from 'react';
import { useData } from '../../lib/data/app-store';
import { examPrep, nextExam, waterOn } from '../../lib/stats/derive';
import { AgendaCard } from './AgendaCard';
import { useOccurrences } from '../../lib/recurrence/use-occurrences';
import { HabitsTodayCard } from './HabitsTodayCard';
import { FocusTimeCard } from './FocusTimeCard';
import { PrepCard } from './PrepCard';
import type { StatsModel } from './useStatsModel';
import { WaterCard } from './WaterCard';

/** Seção “Hoje”: tempo de foco, preparação, água, hábitos de hoje (com chamas) e agenda. */
export function TodaySection({ now, today, index, habits, habitCtx }: StatsModel) {
  const subjects = useData((s) => s.subjects);
  const { events, preferences, focusSessions } = index.data;

  const exam = useMemo(() => nextExam(events, now), [events, now]);
  // A agenda de hoje mostra as ocorrências das séries no dia.
  const agendaEvents = useOccurrences(today, today);
  const subjectName = subjects.find((s) => s.id === exam?.subjectId)?.name;

  return (
    <div className="grid-stats">
      {/* Wrappers `contents`: no desktop somem; no celular só definem a ordem de leitura. */}
      <div className="contents max-md:order-2 max-md:block">
        <FocusTimeCard sessions={focusSessions} today={today} />
      </div>
      <div className="contents max-md:order-1 max-md:block">
        <PrepCard prep={exam ? examPrep(exam) : undefined} subjectName={subjectName} now={now} />
      </div>
      <div className="flex min-h-0 min-w-0 flex-col gap-card-gap max-md:order-4 max-md:flex-col-reverse">
        <WaterCard
          ml={waterOn(index, today)}
          goalMl={preferences.waterGoalMl}
          cupMl={preferences.cupMl}
          now={now}
        />
      </div>
      <div className="max-md:order-3 xl:row-span-2">
        <HabitsTodayCard habits={habits} ctx={habitCtx} now={now} />
      </div>
      <div className="col-span-1 max-md:order-5 md:col-span-2 lg:col-span-3">
        <AgendaCard events={agendaEvents} subjects={subjects} today={today} now={now} />
      </div>
    </div>
  );
}
