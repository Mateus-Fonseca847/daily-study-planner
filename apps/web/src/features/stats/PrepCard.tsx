import { FileCheck2 } from 'lucide-react';
import { parseISO } from 'date-fns';
import { Button } from '../../components/ui/Button';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { formatCountdown } from '../../lib/data/countdown';
import { openEventForm } from '../../lib/ui-store';
import type { ExamPrep } from '../../lib/stats/derive';
import { StatCard } from './StatCard';

interface PrepCardProps {
  prep: ExamPrep | undefined;
  subjectName: string | undefined;
  now: Date;
}

/** Preparação para a próxima prova: anel com a %, matéria e contagem regressiva. */
export function PrepCard({ prep, subjectName, now }: PrepCardProps) {
  return (
    <StatCard title="Preparação" to="/provas" actionLabel="Abrir provas" className="h-full">
      {prep ? (
        <>
          <div className="flex flex-1 items-center justify-center py-4">
            <ProgressRing
              percent={prep.percent}
              aria-label={`Preparação para ${prep.exam.title}: ${prep.percent}% dos conteúdos`}
            >
              <span className="text-stat font-normal tabular-nums">{prep.percent}%</span>
              <span className="text-sm text-muted">
                {prep.hint ?? `${prep.done}/${prep.total} conteúdos`}
              </span>
            </ProgressRing>
          </div>
          <div className="flex items-end justify-between gap-3">
            <p className="min-w-0 truncate text-md text-muted" title={prep.exam.title}>
              {subjectName ?? 'Sem matéria'}
            </p>
            <span className="shrink-0 text-stat font-normal">
              {formatCountdown(parseISO(prep.exam.start), now)}
            </span>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <FileCheck2 aria-hidden strokeWidth={1.5} className="size-avatar-md text-muted" />
          <p className="text-md text-muted">Nenhuma prova à vista.</p>
          <Button variant="secondary" onClick={() => openEventForm({ type: 'prova' })}>
            Criar prova
          </Button>
        </div>
      )}
    </StatCard>
  );
}
