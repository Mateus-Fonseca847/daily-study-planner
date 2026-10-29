import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type RingTone = 'idle' | 'running' | 'paused' | 'done';

const TONE_STROKE: Record<RingTone, string> = {
  idle: 'stroke-timer-idle',
  running: 'stroke-timer-progress',
  paused: 'stroke-timer-paused',
  done: 'stroke-timer-done',
};

interface TimerRingProps {
  tone: RingTone;
  /** Fração do arco (0–1): 1 = anel completo; diminui conforme o tempo passa. */
  arc: number;
  /** Conteúdo dentro do anel (tempo e ícones). */
  children: ReactNode;
}

/** Anel SVG do cronômetro: só indicador de progresso (sem alça nem arrastar). */
export function TimerRing({ tone, arc, children }: TimerRingProps) {
  const value = Math.min(1, Math.max(0, arc)) * 100; // pathLength = 100
  return (
    <div className="relative size-timer">
      <svg viewBox="0 0 100 100" aria-hidden className="size-full -rotate-90 overflow-visible">
        <circle cx="50" cy="50" r="50" fill="none" className="stroke-timer stroke-timer-track" />
        <circle
          cx="50"
          cy="50"
          r="50"
          fill="none"
          pathLength={100}
          strokeLinecap="round"
          strokeDasharray={`${value} 100`}
          className={cn(
            'stroke-timer transition-[stroke] duration-200 motion-reduce:transition-none',
            TONE_STROKE[tone],
            value <= 0 && 'opacity-0',
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        {children}
      </div>
    </div>
  );
}
