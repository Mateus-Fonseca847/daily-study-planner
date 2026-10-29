import { useMemo, useState, type FormEvent } from 'react';
import { eachDayOfInterval, endOfWeek, format, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LayoutGrid, Pencil, Trash2 } from 'lucide-react';
import { isExam, isStudyBlock, type StudyBlock } from '@daily/shared';
import { PageShell } from '../../components/layout/PageShell';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { EmptyState } from '../../components/ui/EmptyState';
import { Select } from '../../components/ui/Select';
import { SubjectLabel } from '../../components/ui/SubjectLabel';
import { deleteEventWithUndo } from '../../lib/data/actions';
import { useData } from '../../lib/data/app-store';
import { appNow } from '../../lib/fixture';
import { dayKeyOf, quickBlockDraft } from '../../lib/forms/quick-create';
import { openEventForm } from '../../lib/ui-store';

function BlockRow({ block }: { block: StudyBlock }) {
  const subject = useData((s) => s.subjects.find((x) => x.id === block.subjectId));
  const exam = useData((s) => s.events.find((e) => e.id === block.examId));
  const setStatus = useData((s) => s.setEventStatus);
  const done = block.status === 'concluido';
  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border-hair bg-surface px-4 py-3">
      <div className="flex min-w-0 flex-col gap-1">
        <Checkbox
          label={block.title}
          checked={done}
          onChange={(e) => setStatus(block.id, e.target.checked ? 'concluido' : 'pendente')}
        />
        <div className="flex flex-wrap items-center gap-x-3 pl-6 text-sm text-muted">
          <span>
            {block.start.slice(11, 16)} – {block.end.slice(11, 16)}
          </span>
          <SubjectLabel subject={subject} />
          {exam && <span>Prova: {exam.title}</span>}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="tile"
          size="sm"
          aria-label={`Editar ${block.title}`}
          onClick={() => openEventForm({ event: block })}
        >
          <Pencil aria-hidden strokeWidth={1.5} className="size-icon-sm" />
        </Button>
        <Button
          variant="tile"
          size="sm"
          aria-label={`Excluir ${block.title}`}
          onClick={() => deleteEventWithUndo(block.id)}
        >
          <Trash2 aria-hidden strokeWidth={1.5} className="size-icon-sm" />
        </Button>
      </div>
    </li>
  );
}

export function BlocksPage() {
  const events = useData((s) => s.events);
  const subjects = useData((s) => s.subjects);
  const createEvent = useData((s) => s.createEvent);
  const now = useMemo(() => appNow(), []);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [examId, setExamId] = useState('');

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(now), end: endOfWeek(now) }),
    [now],
  );
  const byDay = useMemo(() => {
    const map = new Map<string, StudyBlock[]>();
    for (const block of events
      .filter(isStudyBlock)
      .sort((a, b) => a.start.localeCompare(b.start))) {
      const key = block.start.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), block]);
    }
    return map;
  }, [events]);
  const weekHasBlocks = days.some((d) => byDay.has(dayKeyOf(d)));

  const exams = events.filter(isExam);
  const add = (e: FormEvent) => {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    createEvent(
      quickBlockDraft(value, now, { subjectId: subjectId || null, examId: examId || null }),
    );
    setTitle('');
  };

  return (
    <PageShell title="Blocos de estudo" description="Os blocos de estudo desta semana, dia a dia.">
      <form onSubmit={add} className="flex flex-wrap items-center gap-2">
        <input
          aria-label="Novo bloco de estudo"
          placeholder="Novo bloco (próxima hora) — Enter para adicionar"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          className="h-control min-w-0 flex-1 rounded-full border-hair bg-surface px-5 text-md text-fg placeholder:text-muted"
        />
        <Select
          aria-label="Matéria do bloco"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          options={[
            { value: '', label: 'Sem matéria' },
            ...subjects.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
        <Select
          aria-label="Prova vinculada"
          value={examId}
          onChange={(e) => setExamId(e.target.value)}
          options={[
            { value: '', label: 'Sem prova' },
            ...exams.map((x) => ({ value: x.id, label: x.title })),
          ]}
        />
        <Button type="submit">Adicionar</Button>
      </form>

      {!weekHasBlocks && (
        <EmptyState
          icon={LayoutGrid}
          title="Nenhum bloco esta semana"
          description="Planeje seus horários de estudo: digite um título acima e pressione Enter."
        />
      )}
      <div className="flex flex-col gap-5">
        {days.map((day) => {
          const blocks = byDay.get(dayKeyOf(day)) ?? [];
          if (!weekHasBlocks) return null;
          return (
            <section
              key={dayKeyOf(day)}
              aria-label={format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
            >
              <h2 className="mb-2 text-base font-semibold text-soft first-letter:uppercase">
                {format(day, "EEEE, d 'de' MMM", { locale: ptBR })}
              </h2>
              {blocks.length === 0 ? (
                <p className="text-sm text-muted">Nenhum bloco.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {blocks.map((block) => (
                    <BlockRow key={block.id} block={block} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </PageShell>
  );
}
