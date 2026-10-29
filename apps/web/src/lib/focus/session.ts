import { type ActiveFocus, type FocusLink, type FocusSession } from '@daily/shared';
import { toLocalIso } from '../dates';
import { MIN_SAVED_SESSION_SEC } from './constants';
import { clampSeconds } from './time-input';

/**
 * Máquina de estados do cronômetro, toda pura: cada função recebe `nowMs` (epoch ms).
 *
 *   ocioso ──iniciar──▶ rodando ⇄ pausado ──encerrar/finalizar──▶ (sessão salva ou descartada)
 *
 * O tempo restante é SEMPRE `fimEm − agora` (timestamps), nunca uma contagem de ticks.
 */

export const NO_LINK: FocusLink = { subjectId: null, examId: null, blockId: null };

export interface NewSession {
  id: string;
  /** Duração escolhida em segundos (1 min a 3 h). */
  seconds: number;
  tabId: string;
  locked?: boolean;
  link?: FocusLink;
}

export function createIdleSession({
  id,
  seconds,
  tabId,
  locked = false,
  link = NO_LINK,
}: NewSession): ActiveFocus {
  return {
    id,
    status: 'ocioso',
    durationSec: clampSeconds(seconds),
    startedAtMs: null,
    endsAtMs: null,
    remainingMs: null,
    locked,
    link,
    tabId,
  };
}

/** ocioso → rodando. */
export function iniciar(session: ActiveFocus, nowMs: number): ActiveFocus {
  if (session.status !== 'ocioso') return session;
  return {
    ...session,
    status: 'rodando',
    startedAtMs: nowMs,
    endsAtMs: nowMs + session.durationSec * 1000,
    remainingMs: null,
  };
}

/** rodando → pausado (congela o restante). */
export function pausar(session: ActiveFocus, nowMs: number): ActiveFocus {
  if (session.status !== 'rodando') return session;
  return {
    ...session,
    status: 'pausado',
    remainingMs: restanteMs(session, nowMs),
    endsAtMs: null,
  };
}

/** pausado → rodando (novo fim = agora + restante). */
export function retomar(session: ActiveFocus, nowMs: number): ActiveFocus {
  if (session.status !== 'pausado') return session;
  return {
    ...session,
    status: 'rodando',
    endsAtMs: nowMs + (session.remainingMs ?? session.durationSec * 1000),
    remainingMs: null,
  };
}

/** Volta ao tempo escolhido, parado (mantém vínculo e trava). */
export function reiniciar(session: ActiveFocus): ActiveFocus {
  return { ...session, status: 'ocioso', startedAtMs: null, endsAtMs: null, remainingMs: null };
}

/** Tempo restante em ms, sempre derivado de timestamps. */
export function restanteMs(session: ActiveFocus, nowMs: number): number {
  switch (session.status) {
    case 'ocioso':
      return session.durationSec * 1000;
    case 'pausado':
      return Math.max(0, session.remainingMs ?? session.durationSec * 1000);
    case 'rodando':
      return Math.max(0, (session.endsAtMs ?? nowMs) - nowMs);
  }
}

/** Fração do tempo que ainda falta (1 = cheio, 0 = acabou). */
export const fracaoRestante = (session: ActiveFocus, nowMs: number): number =>
  restanteMs(session, nowMs) / (session.durationSec * 1000);

/** Segundos de foco efetivos até agora (a pausa não conta). */
export const decorridoSec = (session: ActiveFocus, nowMs: number): number =>
  Math.min(
    session.durationSec,
    Math.floor((session.durationSec * 1000 - restanteMs(session, nowMs)) / 1000),
  );

/** A sessão estava rodando e o tempo acabou. */
export const terminou = (session: ActiveFocus, nowMs: number): boolean =>
  session.status === 'rodando' && restanteMs(session, nowMs) === 0;

/** Há uma sessão em andamento (rodando ou pausada)? */
export const emAndamento = (session: ActiveFocus | null): session is ActiveFocus =>
  session !== null && session.status !== 'ocioso';

/** O app deve ficar travado: trava ligada E sessão em andamento. */
export const travado = (session: ActiveFocus | null): boolean =>
  emAndamento(session) && session.locked;

function toRecord(
  session: ActiveFocus,
  status: FocusSession['status'],
  actualSec: number,
): FocusSession {
  return {
    id: session.id,
    startedAt: toLocalIso(new Date(session.startedAtMs ?? 0)),
    plannedSec: session.durationSec,
    actualSec,
    status,
    ...session.link,
  };
}

/** Tempo esgotado: salva como `concluida`, com a duração planejada. */
export function finalizar(session: ActiveFocus): FocusSession {
  return toRecord(session, 'concluida', session.durationSec);
}

/**
 * Encerramento manual: `interrompida` se passou de 1 minuto de foco; abaixo disso, descarta (null).
 */
export function encerrar(session: ActiveFocus, nowMs: number): FocusSession | null {
  if (!emAndamento(session)) return null;
  const elapsed = decorridoSec(session, nowMs);
  return elapsed > MIN_SAVED_SESSION_SEC ? toRecord(session, 'interrompida', elapsed) : null;
}

export interface Restored {
  /** Sessão a continuar (null se não há mais nada em andamento). */
  active: ActiveFocus | null;
  /** Sessão concluída durante a ausência (a página foi recarregada/fechada). */
  finished: FocusSession | null;
}

/**
 * Restauração após recarregar: rodando e `fimEm` já passou → finaliza como `concluida`;
 * rodando e ainda não passou → continua; pausado → mantém o restante; ocioso → nada.
 */
export function restaurar(session: ActiveFocus | null, nowMs: number): Restored {
  if (!session || session.status === 'ocioso') return { active: null, finished: null };
  if (terminou(session, nowMs)) return { active: null, finished: finalizar(session) };
  return { active: session, finished: null };
}
