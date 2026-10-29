/** Sessões com até 1 minuto de foco são descartadas ao encerrar (não viram histórico). */
export const MIN_SAVED_SESSION_SEC = 60;

/** Quanto tempo segurar o botão para destravar o app. */
export const HOLD_TO_UNLOCK_MS = 3000;

/** A UI só redesenha a cada tick; o tempo restante vem sempre de timestamps. */
export const TICK_MS = 250;

/** Passos do ajuste de tempo (só no estado ocioso). */
export const KEY_STEP_MIN = 1;
export const BUTTON_STEP_MIN = 5;

/** Atalhos de duração. */
export const PRESET_MINUTES = [15, 25, 45, 60, 90] as const;
