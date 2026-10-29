import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileCheck2, Pencil, Plus } from 'lucide-react';
import { examProgress, isExam, type Exam } from '@daily/shared';
import { PageShell } from '../../components/layout/PageShell';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { SubjectLabel } from '../../components/ui/SubjectLabel';
import { Tabs } from '../../components/ui/Tabs';
import { useData } from '../../lib/data/app-store';
import { formatCountdown } from '../../lib/data/countdown';
import { EVENT_STATUS_LABEL } from '../../lib/event-meta';
import { appNow } from '../../lib/fixture';
import { toLocalIso } from '../../lib/dates';
import { openEventForm } from '../../lib/ui-store';

type ExamTab = 'proximas' | 'passadas';
const TABS = [
  { value: 'proximas', label: 'Próximas' },
  { value: 'passadas', label: 'Passadas' },
] as const;

function ExamRow({ exam, now }: { exam: Exam; now: Date }) {
  const subject = useData((s) => s.subjects.find((x) => x.id === exam.subjectId));
  const progress = examProgress(exam.contents);
  const start = parseISO(exam.start);
  return (
    <li className="flex flex-col gap-3 rounded-xl border-hair bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-md font-semibold">{exam.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 text-base text-muted">
            <SubjectLabel subject={subject} />
            <span>{format(start, "EEE, d 'de' MMM 'às' HH:mm", { locale: ptBR })}</span>
            {exam.status !== 'pendente' && <span>{EVENT_STATUS_LABEL[exam.status]}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="rounded-full bg-hover px-3 py-1 text-base font-medium">
            {formatCountdown(start, now)}
          </span>
          <Button
            variant="tile"
            size="sm"
            aria-label={`Editar ${exam.title}`}
            onClick={() => openEventForm({ event: exam })}
          >
            <Pencil aria-hidden strokeWidth={1.5} className="size-icon-sm" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ProgressBar value={progress.ratio} aria-label={`Progresso de ${exam.title}`} />
        <span className="shrink-0 text-sm text-muted">
          {progress.done}/{progress.total} conteúdos
        </span>
      </div>
    </li>
  );
}

export function ExamsPage() {
  const events = useData((s) => s.events);
  const [tab, setTab] = useState<ExamTab>('proximas');
  const now = useMemo(() => appNow(), []);

  const { upcoming, past } = useMemo(() => {
    const nowIso = toLocalIso(now);
    const exams = events.filter(isExam).sort((a, b) => a.start.localeCompare(b.start));
    return {
      upcoming: exams.filter((e) => e.end >= nowIso),
      past: exams.filter((e) => e.end < nowIso).reverse(),
    };
  }, [events, now]);

  const list = tab === 'proximas' ? upcoming : past;

  return (
    <PageShell
      title="Provas"
      description="Suas provas, com contagem regressiva e progresso dos conteúdos."
      actions={
        <Button onClick={() => openEventForm({ type: 'prova' })}>
          <Plus aria-hidden strokeWidth={1.5} className="size-icon" />
          Nova Prova
        </Button>
      }
    >
      <Tabs tabs={TABS} value={tab} onChange={setTab} aria-label="Período das provas">
        {list.length === 0 ? (
          <EmptyState
            icon={FileCheck2}
            title={tab === 'proximas' ? 'Nenhuma prova próxima' : 'Nenhuma prova passada'}
            description={
              tab === 'proximas'
                ? 'Cadastre suas provas e acompanhe o progresso dos conteúdos.'
                : 'As provas que já aconteceram aparecem aqui.'
            }
          >
            {tab === 'proximas' && (
              <Button onClick={() => openEventForm({ type: 'prova' })}>Criar prova</Button>
            )}
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {list.map((exam) => (
              <ExamRow key={exam.id} exam={exam} now={now} />
            ))}
          </ul>
        )}
      </Tabs>
    </PageShell>
  );
}
