import type { ActiveFocus } from '@daily/shared';
import { cn } from '../../lib/cn';
import { useFrameNow, useNowMs, usePrefersReducedMotion } from '../../lib/focus/browser';
import { formatClock, formatFraction } from '../../lib/focus/format';
import { restanteMs } from '../../lib/focus/session';

interface DigitsProps {
  text: string;
  label: string;
  /** Milésimos ao lado dos dígitos (só enquanto roda); o espaço é sempre reservado. */
  fraction?: string;
  blink?: boolean;
}

/** Dígitos grandes (somente leitura) com a fração em cinza no baseline. */
export function Digits({ text, label, fraction, blink }: DigitsProps) {
  return (
    <div className="flex items-baseline justify-center gap-2">
      <span
        role="timer"
        aria-label={label}
        className={cn(
          'text-focus font-extrabold tracking-tight tabular-nums text-fg',
          blink && 'animate-pulse motion-reduce:animate-none',
        )}
      >
        {text}
      </span>
      <span
        aria-hidden
        className="inline-block min-w-focus-frac text-left text-focus-frac font-medium tabular-nums text-frac"
      >
        {fraction}
      </span>
    </div>
  );
}

/**
 * Dígitos da sessão em andamento. Rodando, atualiza a cada quadro (com a fração dos milésimos);
 * com movimento reduzido, uma vez por segundo e sem fração.
 */
export function ActiveDigits({ active }: { active: ActiveFocus }) {
  const reduced = usePrefersReducedMotion();
  const running = active.status === 'rodando';
  const frameNow = useFrameNow(running && !reduced);
  const secondNow = useNowMs(1000, running && reduced);
  const nowMs = reduced ? secondNow : frameNow;
  const remaining = restanteMs(active, nowMs);
  return (
    <Digits
      text={formatClock(remaining, reduced ? 'up' : 'down')}
      label="Tempo restante"
      fraction={running && !reduced ? formatFraction(remaining) : undefined}
      blink={active.status === 'pausado'}
    />
  );
}
