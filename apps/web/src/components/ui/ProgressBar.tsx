interface ProgressBarProps {
  /** Fração entre 0 e 1. */
  value: number;
  'aria-label': string;
}

export function ProgressBar({ value, 'aria-label': ariaLabel }: ProgressBarProps) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-progress w-full overflow-hidden rounded-full bg-hover"
    >
      <div
        className="h-full rounded-full bg-accent transition-[width]"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
