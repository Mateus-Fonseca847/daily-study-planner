import { useEffect } from 'react';
import { useBlocker, useLocation, Navigate } from 'react-router-dom';
import { useData } from '../../lib/data/app-store';
import { useNowMs, useWakeLock } from '../../lib/focus/browser';
import { TICK_MS } from '../../lib/focus/constants';
import { finishFocus, restoreFocusOnLoad } from '../../lib/focus/controller';
import { useFocusUi } from '../../lib/focus/focus-ui-store';
import { BASE_TITLE, sessionTitle } from '../../lib/focus/format';
import { emAndamento, restanteMs, terminou, travado } from '../../lib/focus/session';

export const FOCUS_PATH = '/foco';

/**
 * Efeitos globais do cronômetro (montado uma vez no AppShell, então valem em qualquer rota):
 * restauração ao abrir, fim da sessão, título da aba, wake lock e aviso ao sair da página travada.
 * Renderiza nada.
 */
export function FocusRuntime() {
  const active = useData((s) => s.focusActive);
  const running = emAndamento(active);
  const nowMs = useNowMs(TICK_MS, running);
  const titleAlert = useFocusUi((s) => s.titleAlert);
  const setTitleAlert = useFocusUi((s) => s.setTitleAlert);

  useEffect(() => restoreFocusOnLoad(), []);

  // O fim é decidido por timestamp (fimEm − agora); o tick só dá a oportunidade de checar.
  useEffect(() => {
    if (active && terminou(active, nowMs)) finishFocus(active);
  }, [active, nowMs]);

  useWakeLock(active?.status === 'rodando');

  useEffect(() => {
    document.title = titleAlert
      ? 'Sessão concluída'
      : active && running
        ? sessionTitle(restanteMs(active, nowMs))
        : BASE_TITLE;
  }, [titleAlert, active, running, nowMs]);

  // “Sessão concluída” fica no título até o usuário interagir.
  useEffect(() => {
    if (!titleAlert) return;
    const clear = () => setTitleAlert(false);
    document.addEventListener('pointerdown', clear, { once: true });
    document.addEventListener('keydown', clear, { once: true });
    return () => {
      document.removeEventListener('pointerdown', clear);
      document.removeEventListener('keydown', clear);
    };
  }, [titleAlert, setTitleAlert]);

  // Recarregar/fechar com o app travado mostra o aviso padrão do navegador.
  const locked = travado(active);
  useEffect(() => {
    if (!locked) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [locked]);

  return null;
}

/**
 * Trava a navegação interna: bloqueia trocas de rota (botões, voltar/avançar) e devolve
 * qualquer rota digitada na URL para /foco. Só age com o app travado.
 */
export function FocusLockGuard({ locked }: { locked: boolean }) {
  const location = useLocation();
  const blocker = useBlocker(({ nextLocation }) => locked && nextLocation.pathname !== FOCUS_PATH);

  useEffect(() => {
    if (blocker.state === 'blocked') blocker.reset();
  }, [blocker]);

  if (locked && location.pathname !== FOCUS_PATH) return <Navigate to={FOCUS_PATH} replace />;
  return null;
}
