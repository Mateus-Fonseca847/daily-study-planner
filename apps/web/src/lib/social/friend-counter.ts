/**
 * Quando buscar o número de pedidos recebidos: ao começar (app aberto e logado), ao voltar o foco
 * para a aba e a cada 60 s SÓ com a aba visível. Aba oculta ou social inativo: nenhuma
 * requisição. Tudo injetável (documento, janela, relógio) para os testes.
 */

export const COUNTER_INTERVAL_MS = 60_000;
/** Foco e visibilidade costumam disparar juntos: uma busca só dentro deste intervalo. */
export const COUNTER_MIN_GAP_MS = 5_000;

export interface CounterDeps {
  fetchCount(): Promise<void>;
  /** Logado, com perfil social ativo e o recurso disponível. */
  isActive(): boolean;
  doc: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
  win: Pick<Window, 'addEventListener' | 'removeEventListener' | 'setInterval' | 'clearInterval'>;
  now?: () => number;
  intervalMs?: number;
}

export interface CounterPolling {
  /** Reavalia agora (ex.: o perfil acabou de ser ativado). */
  refresh(): void;
  stop(): void;
}

export function startCounterPolling(deps: CounterDeps): CounterPolling {
  const now = deps.now ?? (() => Date.now());
  const intervalMs = deps.intervalMs ?? COUNTER_INTERVAL_MS;
  let timer: number | null = null;
  let last = -Infinity;

  const visible = () => deps.doc.visibilityState === 'visible';

  const tick = (force = false) => {
    if (!visible() || !deps.isActive()) return;
    if (!force && now() - last < COUNTER_MIN_GAP_MS) return;
    last = now();
    void deps.fetchCount().catch(() => undefined);
  };

  const schedule = () => {
    const want = visible() && deps.isActive();
    if (want && timer === null) {
      timer = deps.win.setInterval(() => tick(true), intervalMs);
    } else if (!want && timer !== null) {
      deps.win.clearInterval(timer);
      timer = null;
    }
  };

  const onVisibility = () => {
    schedule();
    tick();
  };
  const onFocus = () => tick();

  deps.doc.addEventListener('visibilitychange', onVisibility);
  deps.win.addEventListener('focus', onFocus);
  schedule();
  tick();

  return {
    refresh() {
      schedule();
      tick();
    },
    stop() {
      deps.doc.removeEventListener('visibilitychange', onVisibility);
      deps.win.removeEventListener('focus', onFocus);
      if (timer !== null) deps.win.clearInterval(timer);
      timer = null;
    },
  };
}
