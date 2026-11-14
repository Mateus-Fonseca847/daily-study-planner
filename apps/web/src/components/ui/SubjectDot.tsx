import { resolvePaletteColor, type PaletteColor, type SubjectColor } from '@daily/shared';
import { cn } from '../../lib/cn';

/** Classes literais (o Tailwind precisa enxergá-las) para cada cor da paleta de matérias. */
export const SUBJECT_COLOR_CLASS: Record<PaletteColor, string> = {
  ciano: 'bg-subject-ciano',
  petroleo: 'bg-subject-petroleo',
  gelo: 'bg-subject-gelo',
  lilas: 'bg-subject-lilas',
  fucsia: 'bg-subject-fucsia',
  rosa: 'bg-subject-rosa',
  cinza: 'bg-subject-cinza',
  vermelho: 'bg-subject-vermelho',
  carmim: 'bg-subject-carmim',
  coral: 'bg-subject-coral',
  laranja: 'bg-subject-laranja',
  terracota: 'bg-subject-terracota',
  amarelo: 'bg-subject-amarelo',
  mostarda: 'bg-subject-mostarda',
  lima: 'bg-subject-lima',
  verde: 'bg-subject-verde',
  oliva: 'bg-subject-oliva',
  menta: 'bg-subject-menta',
  celeste: 'bg-subject-celeste',
  azul: 'bg-subject-azul',
  anil: 'bg-subject-anil',
  violeta: 'bg-subject-violeta',
  roxo: 'bg-subject-roxo',
  vinho: 'bg-subject-vinho',
  marrom: 'bg-subject-marrom',
  pedra: 'bg-subject-pedra',
  grafite: 'bg-subject-grafite',
};

/** Classe da cor guardada (desconhecida = cor segura). */
export const subjectColorClass = (color: string): string =>
  SUBJECT_COLOR_CLASS[resolvePaletteColor(color)];

export function SubjectDot({ color, className }: { color: SubjectColor; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-dot shrink-0 rounded-full',
        subjectColorClass(color),
        className,
      )}
    />
  );
}
