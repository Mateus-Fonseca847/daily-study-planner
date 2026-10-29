import type { ActiveFocus } from '@daily/shared';
import { useData } from '../data/app-store';
import { TAB_ID } from '../tab-id';
import { playChime, primeAudio } from './audio';
import { enterFullscreen, leaveFullscreen } from './browser';
import { useFocusUi } from './focus-ui-store';
import {
  createIdleSession,
  encerrar,
  finalizar,
  iniciar,
  NO_LINK,
  pausar,
  restaurar,
  retomar,
} from './session';

/**
 * Ações do cronômetro sobre o store. A lógica de estados é pura (`session.ts`); aqui só
 * ficam os efeitos: persistir, tela cheia, som e resumo.
 */

const store = () => useData.getState();
const active = (): ActiveFocus | null => store().focusActive;

export interface StartConfig {
  /** Duração escolhida, em segundos. */
  seconds: number;
  locked: boolean;
}

/** Deve rodar dentro de um clique (tela cheia e áudio exigem gesto do usuário). */
export function startFocus({ seconds, locked }: StartConfig): void {
  // O vínculo (matéria/prova/bloco) segue no modelo, mas não há interface para escolhê-lo.
  const idle = createIdleSession({
    id: crypto.randomUUID(),
    seconds,
    tabId: TAB_ID,
    locked,
    link: NO_LINK,
  });
  useFocusUi.getState().setSummary(null);
  useFocusUi.getState().setTitleAlert(false);
  primeAudio();
  if (locked) void enterFullscreen();
  store().setFocusActive(iniciar(idle, Date.now()));
}

export function pauseFocus(): void {
  const current = active();
  if (current) store().setFocusActive(pausar(current, Date.now()));
}

export function resumeFocus(): void {
  const current = active();
  if (current) store().setFocusActive(retomar(current, Date.now()));
}

/** Reiniciar: descarta a sessão e volta ao seletor de tempo (o estado “ocioso” não é persistido). */
export function resetFocus(): void {
  const current = active();
  if (!current) return;
  store().setFocusActive(null);
  void leaveFullscreen();
}

/** Liga/desliga a trava. Ligar durante uma sessão pede tela cheia (gesto do usuário). */
export function setFocusLocked(locked: boolean): void {
  const current = active();
  if (!current) return;
  store().setFocusActive({ ...current, locked });
  if (locked) void enterFullscreen();
  else void leaveFullscreen();
}

/** Encerramento manual: salva como interrompida (se passou de 1 min) e volta ao seletor de tempo. */
export function stopFocus(): void {
  const current = active();
  if (!current) return;
  const record = encerrar(current, Date.now());
  if (record) store().addFocusSession(record);
  store().setFocusActive(null);
  void leaveFullscreen();
}

/** O tempo acabou: salva como concluída, destrava, toca o som (só na aba que iniciou) e mostra o resumo. */
export function finishFocus(current: ActiveFocus): void {
  const record = finalizar(current);
  store().addFocusSession(record); // idempotente pelo id: duas abas podem finalizar a mesma sessão
  store().setFocusActive(null);
  useFocusUi.getState().setSummary(record);
  useFocusUi.getState().setTitleAlert(true);
  void leaveFullscreen();
  if (current.tabId === TAB_ID) playChime();
}

/** Ao abrir o app: sessão que acabou enquanto a página estava fechada vira “concluída”. */
export function restoreFocusOnLoad(): void {
  const { finished } = restaurar(active(), Date.now());
  if (!finished) return;
  store().addFocusSession(finished);
  store().setFocusActive(null);
  useFocusUi.getState().setSummary(finished);
  useFocusUi.getState().setTitleAlert(true);
}
