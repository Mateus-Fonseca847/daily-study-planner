import { browserStorage } from './browser-storage';

const KEY = 'daily:sidebar-collapsed';

/** Escolha de recolher/expandir a barra lateral, lembrada no notebook pequeno (1024–1279 px). */
export function readSidebarCollapsed(): boolean {
  try {
    return browserStorage().getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function saveSidebarCollapsed(collapsed: boolean): void {
  try {
    browserStorage().setItem(KEY, collapsed ? '1' : '0');
  } catch {
    /* sem armazenamento: a escolha vale só nesta sessão */
  }
}
