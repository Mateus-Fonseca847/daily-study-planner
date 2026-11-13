import { Repeat2 } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * Ícone de repetição de uma ocorrência de série. Com `label` (o texto da regra) é uma imagem
 * acessível; dentro de um botão que já descreve a regra, use `decorative`.
 */
export function RecurrenceIcon({
  label,
  decorative = false,
  className,
}: {
  label: string;
  decorative?: boolean;
  className?: string;
}) {
  return (
    <Repeat2
      {...(decorative
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': `Repete: ${label}` })}
      strokeWidth={1.75}
      className={cn('size-icon-sm shrink-0', className)}
    >
      {!decorative && <title>{`Repete: ${label}`}</title>}
    </Repeat2>
  );
}
