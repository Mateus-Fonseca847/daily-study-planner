import type { ReactNode } from 'react';

interface ProgressRingProps {
  /** 0–100. */
  percent: number;
  /** Conteúdo central. */
  children: ReactNode;
  'aria-label': string;
}

/** Anel de progresso dos cartões (`role="progressbar"`): trilha neutra e arco amarelo. */
export function ProgressRing({ percent, children, 'aria-label': ariaLabel }: ProgressRingProps) {
  const value = Math.min(100, Math.max(0, percent));
  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className="relative size-ring"
    >
      <svg viewBox="0 0 100 100" aria-hidden className="size-full -rotate-90 overflow-visible">
        <circle cx="50" cy="50" r="46" fill="none" className="stroke-ring stroke-chart-track" />
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          pathLength={100}
          strokeLinecap="round"
          strokeDasharray={`${value} 100`}
          className={value <= 0 ? 'stroke-ring opacity-0' : 'stroke-ring stroke-accent'}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
