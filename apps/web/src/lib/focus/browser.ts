import { useEffect, useState, useSyncExternalStore } from 'react';

/* ───────────── Tela cheia ───────────── */

/** Deve ser chamada dentro de um clique/tecla (gesto do usuário). Falhas são silenciosas. */
export async function enterFullscreen(): Promise<void> {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
  } catch {
    /* o navegador recusou: o app segue travado mesmo assim */
  }
}

export async function leaveFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {
    /* já saiu */
  }
}

const subscribeFullscreen = (cb: () => void) => {
  document.addEventListener('fullscreenchange', cb);
  return () => document.removeEventListener('fullscreenchange', cb);
};

/** `true` enquanto a página está em tela cheia. */
export const useIsFullscreen = (): boolean =>
  useSyncExternalStore(subscribeFullscreen, () => document.fullscreenElement !== null);

/* ───────────── Screen Wake Lock ───────────── */

export const wakeLockSupported = (): boolean => 'wakeLock' in navigator;

/** Mantém a tela ligada enquanto `active`; readquire ao voltar à aba (o navegador libera ao ocultá-la). */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !wakeLockSupported()) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) void lock.release();
        else sentinel = lock;
      } catch {
        /* sem permissão ou bateria baixa */
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release();
    };
  }, [active]);
}

/* ───────────── Relógio de exibição ───────────── */

/** Timestamp atual, atualizado a cada `intervalMs` (só enquanto `enabled`). Serve apenas à exibição. */
export function useNowMs(intervalMs: number, enabled: boolean): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!enabled) return;
    const update = () => setNow(Date.now());
    const first = window.setTimeout(update, 0); // evita exibir um instante antigo ao ligar
    const timer = window.setInterval(update, intervalMs);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [intervalMs, enabled]);
  return now;
}
