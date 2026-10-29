import type { Subject } from '@daily/shared';
import { SubjectDot } from './SubjectDot';

/** Ponto colorido + nome da matéria (ou “Sem matéria”). */
export function SubjectLabel({ subject }: { subject: Subject | undefined }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-base text-soft">
      {subject && <SubjectDot color={subject.color} />}
      <span className="truncate">{subject?.name ?? 'Sem matéria'}</span>
    </span>
  );
}
