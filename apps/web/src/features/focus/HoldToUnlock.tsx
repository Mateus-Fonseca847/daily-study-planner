import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { LockOpen } from 'lucide-react';
import { holdProgress } from '../../lib/focus/hold';
import { pillClass } from './FocusPill';

interface HoldToUnlockProps {
  onUnlock: () => void;
}

/**
 * “Segurar para destravar”: o anel em volta do cadeado preenche em 3 s (mouse, toque ou Enter/Espaço segurados).
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
    <div className="flex flex-col items-center">
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
        className={pillClass('outline', 'touch-none select-none')}
      >
        <span
          aria-hidden
          className="relative size-focus-hold rounded-full"
          style={{
            background: `conic-gradient(var(--color-accent) ${progress * 360}deg, var(--color-line-strong) 0)`,
          }}
        >
          <span className="absolute inset-focus-hold-ring grid place-items-center rounded-full bg-bg">
            <LockOpen strokeWidth={1.5} className="size-icon-sm" />
          </span>
        </span>
        <span>Segurar para destravar</span>
      </button>
      <span id="hold-hint" className="sr-only">
        Segure por 3 segundos para destravar. A sessão continua.
      </span>
    </div>
  );
}
