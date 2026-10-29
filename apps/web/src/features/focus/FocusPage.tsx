import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Lock, LockOpen, Pause, Play, RotateCcw, Square } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useData } from '../../lib/data/app-store';
import { useIsFullscreen, useNowMs, wakeLockSupported } from '../../lib/focus/browser';
import { TICK_MS } from '../../lib/focus/constants';
import {
  pauseFocus,
  resetFocus,
  resumeFocus,
  setFocusLocked,
  startFocus,
  stopFocus,
} from '../../lib/focus/controller';
import { useFocusUi } from '../../lib/focus/focus-ui-store';
import { formatFocused } from '../../lib/focus/format';
import { decorridoSec, emAndamento, travado } from '../../lib/focus/session';
import { cn } from '../../lib/cn';
import { DurationInput } from './DurationInput';
import { ActiveDigits, Digits } from './FocusDigits';
import { FocusPill, pillClass } from './FocusPill';
import { HoldToUnlock } from './HoldToUnlock';
import { TopFocusDays } from './TopFocusDays';

/** O Espaço (pausar/retomar) não deve disparar sobre controles interativos. */
const INTERACTIVE = 'button, a, input, select, textarea, [role="slider"], [contenteditable="true"]';

const LOCK_HELP =
  'Com a trava ligada e o cronômetro em andamento, a barra lateral e o topo somem, as outras páginas ficam bloqueadas e a tela cheia é pedida. Para destravar, segure o botão por 3 segundos; a sessão continua.';

export function FocusPage() {
  const prefs = useData((s) => s.preferences);
  const active = useData((s) => s.focusActive);
  const updatePreferences = useData((s) => s.updatePreferences);
  const summary = useFocusUi((s) => s.summary);
  const setSummary = useFocusUi((s) => s.setSummary);

  // A última duração confirmada é o padrão (persistida nas preferências, em segundos).
  const [seconds, setSeconds] = useState(prefs.focusDurationSec);
  const [lockChoice, setLockChoice] = useState(prefs.lockByDefault);
  const [announcement, setAnnouncement] = useState('');
  const [confirmStop, setConfirmStop] = useState(false);

  const running = emAndamento(active);
  const locked = travado(active);
  const nowMs = useNowMs(TICK_MS, running);
  useIsFullscreen(); // re-renderiza ao entrar/sair da tela cheia (o app segue travado)

  // Espaço pausa/retoma, exceto com o app travado (nada de controles enquanto travado).
  useEffect(() => {
    if (!active || locked) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== ' ' || e.repeat) return;
      if (e.target instanceof Element && e.target.closest(INTERACTIVE)) return;
      e.preventDefault();
      if (active.status === 'rodando') onPause();
      else onResume();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active, locked]);

  const commitSeconds = (next: number) => {
    setSeconds(next);
    updatePreferences({ focusDurationSec: next });
  };
  const onStart = () => {
    updatePreferences({ focusDurationSec: seconds });
    startFocus({ seconds, locked: lockChoice });
    setAnnouncement(
      wakeLockSupported()
        ? 'Sessão iniciada.'
        : 'Sessão iniciada. Este navegador não mantém a tela ligada.',
    );
  };
  function onPause() {
    pauseFocus();
    setAnnouncement('Sessão pausada.');
  }
  function onResume() {
    resumeFocus();
    setAnnouncement('Sessão retomada.');
  }
  const elapsedSec = active ? decorridoSec(active, nowMs) : 0;
  const onStop = () => (elapsedSec > 60 ? setConfirmStop(true) : stopFocus());
  const toggleLock = () => {
    const next = !lockChoice;
    setLockChoice(next);
    updatePreferences({ lockByDefault: next });
  };

  const done = summary !== null && !running;
  const paused = active?.status === 'pausado';

  return (
    <div className="flex min-h-0 flex-1 overflow-y-auto p-page py-10">
      <div className="m-auto focus-layout">
        <div className="flex shrink-0 flex-col items-center gap-10">
          {done && summary ? (
            <>
              <div className="flex flex-col items-center gap-3">
                <Digits text="00:00" label="Sessão concluída" />
                <p className="text-lg text-soft">Concluído · {formatFocused(summary.actualSec)}</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <FocusPill variant="accent" onClick={() => setSummary(null)}>
                  <Play aria-hidden strokeWidth={1.5} className="size-icon" />
                  Nova sessão
                </FocusPill>
                <Link to="/estatisticas" className={pillClass('outline')}>
                  <BarChart3 aria-hidden strokeWidth={1.5} className="size-icon" />
                  Ver estatísticas
                </Link>
              </div>
            </>
          ) : active ? (
            <>
              <ActiveDigits active={active} />
              {locked ? (
                <HoldToUnlock onUnlock={() => setFocusLocked(false)} />
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <FocusPill onClick={resetFocus}>
                    <RotateCcw aria-hidden strokeWidth={1.5} className="size-icon" />
                    Reiniciar
                  </FocusPill>
                  <FocusPill onClick={onStop}>
                    <Square aria-hidden strokeWidth={1.5} className="size-icon" />
                    Encerrar
                  </FocusPill>
                  <FocusPill variant="accent" onClick={paused ? onResume : onPause}>
                    {paused ? (
                      <Play aria-hidden strokeWidth={1.5} className="size-icon" />
                    ) : (
                      <Pause aria-hidden strokeWidth={1.5} className="size-icon" />
                    )}
                    {paused ? 'Retomar' : 'Pausar'}
                  </FocusPill>
                </div>
              )}
            </>
          ) : (
            <>
              <DurationInput
                seconds={seconds}
                onCommit={commitSeconds}
                onNotice={setAnnouncement}
              />
              <div className="flex flex-wrap items-center justify-center gap-3">
                <FocusPill
                  aria-pressed={lockChoice}
                  aria-describedby="lock-help"
                  className={cn(lockChoice && 'border-accent text-accent')}
                  onClick={toggleLock}
                >
                  {lockChoice ? (
                    <Lock aria-hidden strokeWidth={1.5} className="size-icon" />
                  ) : (
                    <LockOpen aria-hidden strokeWidth={1.5} className="size-icon" />
                  )}
                  Travar
                </FocusPill>
                <span id="lock-help" className="sr-only">
                  {LOCK_HELP}
                </span>
                <FocusPill variant="accent" onClick={onStart}>
                  <Play aria-hidden strokeWidth={1.5} className="size-icon" />
                  Iniciar
                </FocusPill>
              </div>
            </>
          )}
        </div>

        {!locked && <TopFocusDays />}
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {done ? 'Sessão concluída.' : announcement}
      </div>

      {confirmStop && (
        <Modal
          title="Encerrar a sessão?"
          onClose={() => setConfirmStop(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmStop(false)}>
                Continuar focando
              </Button>
              <Button
                onClick={() => {
                  setConfirmStop(false);
                  stopFocus();
                }}
              >
                Encerrar
              </Button>
            </>
          }
        >
          <p className="pb-2 text-md text-soft">
            Você focou {formatFocused(elapsedSec)}. A sessão será salva como interrompida.
          </p>
        </Modal>
      )}
    </div>
  );
}
