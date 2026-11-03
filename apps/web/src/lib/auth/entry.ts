import { browserStorage } from '../browser-storage';

const KEY = 'daily:entry-seen';

/** A tela de entrada aparece sozinha só na primeira visita (depois, via botão “Entrar”). */
export function hasSeenEntry(): boolean {
  try {
    return browserStorage().getItem(KEY) === '1';
  } catch {
    return true;
  }
}

export function markEntrySeen(): void {
  try {
    browserStorage().setItem(KEY, '1');
  } catch {
    /* ignore */
  }
}
