/** Sessões com até 1 minuto de foco são descartadas ao encerrar (não viram histórico). */
export const MIN_SAVED_SESSION_SEC = 60;

/** Quanto tempo segurar o botão para destravar o app. */
export const HOLD_TO_UNLOCK_MS = 3000;

/** A UI só redesenha a cada tick; o tempo restante vem sempre de timestamps. */
export const TICK_MS = 250;

/** Setas ↑/↓ no campo de tempo: ±1 min (Shift: ±5 min). */
export const SHIFT_STEP_MIN = 5;
