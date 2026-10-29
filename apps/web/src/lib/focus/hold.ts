import { HOLD_TO_UNLOCK_MS } from './constants';

export interface HoldState {
  /** 0 a 1. */
  progress: number;
  completed: boolean;
}

/** Progresso do “segurar para destravar”: `startMs` é quando o pressionamento começou (null = solto). */
export function holdProgress(startMs: number | null, nowMs: number): HoldState {
  if (startMs === null) return { progress: 0, completed: false };
  const elapsed = Math.max(0, nowMs - startMs);
  return {
    progress: Math.min(1, elapsed / HOLD_TO_UNLOCK_MS),
    completed: elapsed >= HOLD_TO_UNLOCK_MS,
  };
}
