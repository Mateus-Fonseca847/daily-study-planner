import type { SubjectColor } from '@daily/shared';
import { cn } from '../../lib/cn';

/** Classes literais (o Tailwind precisa enxergá-las) para cada cor da paleta de matérias. */
export const SUBJECT_COLOR_CLASS: Record<SubjectColor, string> = {
  vermelho: 'bg-subject-vermelho',
  laranja: 'bg-subject-laranja',
  amarelo: 'bg-subject-amarelo',
  verde: 'bg-subject-verde',
  turquesa: 'bg-subject-turquesa',
  azul: 'bg-subject-azul',
  violeta: 'bg-subject-violeta',
  rosa: 'bg-subject-rosa',
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
