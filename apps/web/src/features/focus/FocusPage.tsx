import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, LockOpen, Pause, Play, RotateCcw, Square } from 'lucide-react';
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
import { formatClock, formatFocused } from '../../lib/focus/format';
import {
  decorridoSec,
  emAndamento,
  fracaoRestante,
  restanteMs,
  travado,
} from '../../lib/focus/session';
import { cn } from '../../lib/cn';
import { DurationInput } from './DurationInput';
import { HoldToUnlock } from './HoldToUnlock';
import { TimerRing, type RingTone } from './TimerRing';

/** O Espaço (pausar/retomar) não deve disparar sobre controles interativos. */
const INTERACTIVE = 'button, a, input, select, textarea, [role="slider"], [contenteditable="true"]';

const LOCK_HELP =
  'Com a trava ligada e o cronômetro em andamento, a barra lateral e o topo somem, as outras páginas ficam bloqueadas e a tela cheia é pedida. Para destravar, segure o botão por 3 segundos; a sessão continua.';

/** Tempo dentro do anel (somente leitura). */
function Time({ text, label, blink }: { text: string; label: string; blink?: boolean }) {
  return (
    <span
      role="timer"
      aria-label={label}
      className={cn(
        'text-timer font-light tabular-nums text-fg',
        blink && 'animate-pulse motion-reduce:animate-none',
      )}
    >
      {text}
    </span>
  );
}

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
  const tone: RingTone = done ? 'done' : !active ? 'idle' : paused ? 'paused' : 'running';
  const arc = active ? fracaoRestante(active, nowMs) : 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-10 overflow-y-auto p-page py-10">
      <div className="relative p-4">
        <TimerRing tone={tone} arc={arc}>
          {done && summary && (
            <>
              <span className="text-md text-muted">Concluído</span>
              <Time
                text={formatClock(summary.actualSec * 1000)}
                label={`Duração focada: ${formatFocused(summary.actualSec)}`}
              />
              <Button
                variant="icon"
                aria-label="Nova sessão"
                title="Nova sessão"
                onClick={() => setSummary(null)}
              >
                <Play aria-hidden strokeWidth={1.5} className="size-icon" />
              </Button>
            </>
          )}

          {!done && !active && (
            <>
              <DurationInput
                seconds={seconds}
                onCommit={commitSeconds}
                onNotice={setAnnouncement}
              />
              <Button
                variant="icon"
                aria-label="Iniciar"
                title="Iniciar"
                className="bg-accent! text-accent-fg!"
                onClick={onStart}
              >
                <Play aria-hidden strokeWidth={1.5} className="size-icon" />
              </Button>
            </>
          )}

          {active && (
            <>
              <Time
                text={formatClock(restanteMs(active, nowMs))}
                label="Tempo restante"
                blink={paused}
              />
              {!locked && !paused && (
                <Button variant="icon" aria-label="Pausar" title="Pausar" onClick={onPause}>
                  <Pause aria-hidden strokeWidth={1.5} className="size-icon" />
                </Button>
              )}
              {!locked && paused && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="icon"
                    size="sm"
                    aria-label="Retomar"
                    title="Retomar"
                    onClick={onResume}
                  >
                    <Play aria-hidden strokeWidth={1.5} className="size-icon-sm" />
                  </Button>
                  <Button
                    variant="icon"
                    size="sm"
                    aria-label="Reiniciar"
                    title="Reiniciar"
                    onClick={resetFocus}
                  >
                    <RotateCcw aria-hidden strokeWidth={1.5} className="size-icon-sm" />
                  </Button>
                  <Button
                    variant="icon"
                    size="sm"
                    aria-label="Encerrar"
                    title="Encerrar"
                    onClick={onStop}
                  >
                    <Square aria-hidden strokeWidth={1.5} className="size-icon-sm" />
                  </Button>
                </div>
              )}
            </>
          )}
        </TimerRing>

        {/* Sob o anel (fora do fluxo, para o anel ficar centralizado): cadeado, destravar ou link. */}
        <div className="absolute top-full left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 whitespace-nowrap">
          {!done && !active && (
            <>
              <Button
                variant="icon"
                size="sm"
                aria-label="Travar tela ao iniciar"
                aria-pressed={lockChoice}
                aria-describedby="lock-help"
                title="Travar tela ao iniciar"
                className={cn(lockChoice ? 'text-accent' : 'text-muted')}
                onClick={toggleLock}
              >
                {lockChoice ? (
                  <Lock aria-hidden strokeWidth={1.5} className="size-icon-sm" />
                ) : (
                  <LockOpen aria-hidden strokeWidth={1.5} className="size-icon-sm" />
                )}
              </Button>
              <span id="lock-help" className="sr-only">
                {LOCK_HELP}
              </span>
            </>
          )}
          {locked && <HoldToUnlock onUnlock={() => setFocusLocked(false)} />}
          {done && (
            <Link
              to="/estatisticas"
              className="rounded-sm text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
            >
              Ver estatísticas
            </Link>
          )}
        </div>
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
