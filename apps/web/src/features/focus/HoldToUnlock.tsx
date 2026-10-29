import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { LockOpen } from 'lucide-react';
import { holdProgress } from '../../lib/focus/hold';

interface HoldToUnlockProps {
  onUnlock: () => void;
}

/**
 * “Segurar para destravar”: o anel preenche em 3 s (mouse, toque ou Enter/Espaço segurados).
 * Soltar antes zera o progresso. O destravamento NÃO encerra a sessão.
 */
export function HoldToUnlock({ onUnlock }: HoldToUnlockProps) {
  const [startMs, setStartMs] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const onUnlockRef = useRef(onUnlock);
  useEffect(() => {
    onUnlockRef.current = onUnlock;
  }, [onUnlock]);

  useEffect(() => {
    if (startMs === null) return;
    let frame = 0;
    const tick = () => {
      const state = holdProgress(startMs, Date.now());
      setProgress(state.progress);
      if (state.completed) {
        setStartMs(null);
        onUnlockRef.current();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [startMs]);

  const start = () => setStartMs((current) => current ?? Date.now());
  const stop = () => {
    setStartMs(null);
    setProgress(0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
      e.preventDefault();
      start();
    }
  };
  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') stop();
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        aria-describedby="hold-hint"
        onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          start();
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={stop}
        className="relative inline-flex h-control touch-none items-center gap-2 overflow-hidden rounded-full border-hair border-line-strong px-5 text-base font-medium text-fg select-none"
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-accent-soft"
          style={{ width: `${progress * 100}%` }}
        />
        <LockOpen aria-hidden strokeWidth={1.5} className="relative size-icon" />
        <span className="relative">Segurar para destravar</span>
      </button>
      <span
        id="hold-hint"
        role="progressbar"
        aria-label="Progresso do destravamento"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="text-sm text-muted"
      >
        Segure por 3 segundos
      </span>
    </div>
  );
}
