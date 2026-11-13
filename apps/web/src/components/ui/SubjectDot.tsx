import type { SubjectColor } from '@daily/shared';
import { cn } from '../../lib/cn';

/** Classes literais (o Tailwind precisa enxergá-las) para cada cor da paleta de matérias. */
export const SUBJECT_COLOR_CLASS: Record<SubjectColor, string> = {
  ciano: 'bg-subject-ciano',
  petroleo: 'bg-subject-petroleo',
  gelo: 'bg-subject-gelo',
  lilas: 'bg-subject-lilas',
  fucsia: 'bg-subject-fucsia',
  rosa: 'bg-subject-rosa',
  cinza: 'bg-subject-cinza',
};

export function SubjectDot({ color, className }: { color: SubjectColor; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-dot shrink-0 rounded-full',
        SUBJECT_COLOR_CLASS[color],
        className,
      )}
    />
  );
}
