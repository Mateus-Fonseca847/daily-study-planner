import { useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { FOCUS_MAX_MINUTES, FOCUS_MIN_MINUTES } from '@daily/shared';
import { cn } from '../../lib/cn';
import { angleForMinutes, minutesFromKey, minutesFromPointer } from '../../lib/focus/dial';
import { describeMinutes } from '../../lib/focus/format';

export type RingTone = 'idle' | 'running' | 'paused' | 'done';

const TONE_STROKE: Record<RingTone, string> = {
  idle: 'stroke-timer-progress',
  running: 'stroke-timer-progress',
  paused: 'stroke-timer-paused',
  done: 'stroke-timer-done',
};

interface TimerRingProps {
  tone: RingTone;
  /** Fração do arco a desenhar (0–1): duração/180 no ajuste; tempo restante rodando. */
  arc: number;
  /** Minutos escolhidos; só no estado ocioso o anel é um slider (`onMinutesChange`). */
  minutes: number;
  onMinutesChange?: (minutes: number) => void;
  /** Conteúdo central (dígitos e legenda). */
  children: ReactNode;
}

/**
 * Anel SVG do cronômetro. Ocioso: `role="slider"` (arrastar com ponteiro ou usar o teclado).
 * Rodando/pausado: só exibição, o arco diminui com o tempo.
 */
export function TimerRing({ tone, arc, minutes, onMinutesChange, children }: TimerRingProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const interactive = onMinutesChange !== undefined;
  const value = Math.min(1, Math.max(0, arc)) * 100; // pathLength = 100

  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box || !onMinutesChange) return;
    const center = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    onMinutesChange(minutesFromPointer(center, { x: e.clientX, y: e.clientY }, minutes));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = minutesFromKey(e.key, minutes);
    if (next === null || !onMinutesChange) return;
    e.preventDefault();
    onMinutesChange(next);
  };

  return (
    <div
      ref={ref}
      {...(interactive
        ? {
            role: 'slider',
            tabIndex: 0,
            'aria-label': 'Duração do foco',
            'aria-valuemin': FOCUS_MIN_MINUTES,
            'aria-valuemax': FOCUS_MAX_MINUTES,
            'aria-valuenow': minutes,
            'aria-valuetext': describeMinutes(minutes),
            onKeyDown,
            onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
              dragging.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              e.currentTarget.focus();
              fromPointer(e);
            },
            onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
              if (dragging.current) fromPointer(e);
            },
            onPointerUp: () => {
              dragging.current = false;
            },
            onPointerCancel: () => {
              dragging.current = false;
            },
          }
        : {})}
      className={cn(
        'relative size-timer touch-none rounded-full select-none',
        interactive && 'cursor-pointer',
      )}
    >
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
            'stroke-timer transition-[stroke-dasharray] duration-200 motion-reduce:transition-none',
            TONE_STROKE[tone],
            value <= 0 && 'opacity-0',
          )}
        />
      </svg>
      {interactive && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ transform: `rotate(${angleForMinutes(minutes)}deg)` }}
        >
          <span className="absolute top-0 left-1/2 size-timer-knob -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg shadow-popover" />
        </span>
      )}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
        {children}
      </div>
    </div>
  );
}
