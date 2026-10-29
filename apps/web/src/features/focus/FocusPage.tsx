import { useEffect, useMemo, useState } from 'react';
import { Lock, Pause, Play, RotateCcw, Square, TriangleAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { useData } from '../../lib/data/app-store';
import { appNow } from '../../lib/fixture';
import { wakeLockSupported, useIsFullscreen, useNowMs } from '../../lib/focus/browser';
import { BUTTON_STEP_MIN, PRESET_MINUTES, TICK_MS } from '../../lib/focus/constants';
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
import { buildLinkGroups, decodeLink, encodeLink } from '../../lib/focus/link';
import {
  adjustMinutes,
  decorridoSec,
  emAndamento,
  fracaoRestante,
  restanteMs,
  travado,
} from '../../lib/focus/session';
import { cn } from '../../lib/cn';
import { FocusSummary } from './FocusSummary';
import { HoldToUnlock } from './HoldToUnlock';
import { TimerRing, type RingTone } from './TimerRing';

/** Teclas de ação (Espaço) não devem disparar o atalho do cronômetro sobre controles interativos. */
const INTERACTIVE = 'button, a, input, select, textarea, [role="slider"], [contenteditable="true"]';

export function FocusPage() {
  const prefs = useData((s) => s.preferences);
  const active = useData((s) => s.focusActive);
  const subjects = useData((s) => s.subjects);
  const events = useData((s) => s.events);
  const summary = useFocusUi((s) => s.summary);

  const [minutes, setMinutes] = useState(prefs.focusDurationMin);
  const [lockChoice, setLockChoice] = useState(prefs.lockByDefault);
  const [linkValue, setLinkValue] = useState('');
  const [confirmStop, setConfirmStop] = useState(false);

  const running = emAndamento(active);
  const locked = travado(active);
  const nowMs = useNowMs(TICK_MS, running);
  const fullscreen = useIsFullscreen();

  const linkGroups = useMemo(() => buildLinkGroups(subjects, events, appNow()), [subjects, events]);

  // Atalho do cronômetro: Espaço pausa/retoma (o único atalho ativo com o app travado).
  useEffect(() => {
    if (!active || active.status === 'ocioso') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== ' ' || e.repeat) return;
      if (e.target instanceof Element && e.target.closest(INTERACTIVE)) return;
      e.preventDefault();
      if (active.status === 'rodando') pauseFocus();
      else resumeFocus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active]);

  if (summary && !running) {
    return (
      <div className="flex flex-1 items-center justify-center p-page">
        <FocusSummary session={summary} />
      </div>
    );
  }

  const paused = active?.status === 'pausado';
  const tone: RingTone = !active ? 'idle' : paused ? 'paused' : 'running';
  const remaining = active ? restanteMs(active, nowMs) : minutes * 60_000;
  const arc = active ? fracaoRestante(active, nowMs) : minutes / 180;
  const elapsedSec = active ? decorridoSec(active, nowMs) : 0;
  const lockOn = active ? active.locked : lockChoice;
  const linkSelected = active ? encodeLink(active.link) : linkValue;

  const onStop = () => {
    if (elapsedSec > 60) setConfirmStop(true);
    else stopFocus();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto p-page py-10">
      {locked && !fullscreen && (
        <div className="fixed top-4 right-4 z-40">
          <ReturnToFullscreen />
        </div>
      )}

      <div className="p-4">
        <TimerRing
          tone={tone}
          arc={arc}
          minutes={minutes}
          {...(!active ? { onMinutesChange: setMinutes } : {})}
        >
          <span
            role="timer"
            aria-label="Tempo restante"
            className={cn(
              'text-timer font-light tabular-nums',
              paused ? 'text-timer-paused' : 'text-fg',
            )}
          >
            {formatClock(remaining)}
          </span>
          <span className="text-md text-muted">
            {!active ? 'Ajuste o tempo' : paused ? 'Pausado' : 'Em foco'}
          </span>
        </TimerRing>
      </div>

      {!active && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              aria-label="Diminuir 5 minutos"
              onClick={() => setMinutes((m) => adjustMinutes(m, -BUTTON_STEP_MIN))}
            >
              −5 min
            </Button>
            <Button
              variant="outline"
              aria-label="Aumentar 5 minutos"
              onClick={() => setMinutes((m) => adjustMinutes(m, BUTTON_STEP_MIN))}
            >
              +5 min
            </Button>
          </div>
          <div
            role="group"
            aria-label="Durações rápidas"
            className="flex flex-wrap justify-center gap-2"
          >
            {PRESET_MINUTES.map((preset) => (
              <Button
                key={preset}
                variant="secondary"
                aria-pressed={minutes === preset}
                className={cn('h-select px-4', minutes === preset && 'border-accent! text-accent')}
                onClick={() => setMinutes(preset)}
              >
                {preset} min
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {!active ? (
          <Button
            onClick={() => startFocus({ minutes, locked: lockChoice, link: decodeLink(linkValue) })}
          >
            <Play aria-hidden strokeWidth={1.5} className="size-icon" />
            Iniciar
          </Button>
        ) : (
          <>
            <Button onClick={paused ? resumeFocus : pauseFocus}>
              {paused ? (
                <Play aria-hidden strokeWidth={1.5} className="size-icon" />
              ) : (
                <Pause aria-hidden strokeWidth={1.5} className="size-icon" />
              )}
              {paused ? 'Retomar' : 'Pausar'}
            </Button>
            <Button variant="outline" onClick={resetFocus}>
              <RotateCcw aria-hidden strokeWidth={1.5} className="size-icon" />
              Reiniciar
            </Button>
            <Button variant="outline" onClick={onStop}>
              <Square aria-hidden strokeWidth={1.5} className="size-icon" />
              Encerrar
            </Button>
          </>
        )}
      </div>

      <div className="flex w-full max-w-modal flex-col items-center gap-4">
        <label className="flex w-full flex-col gap-1 text-base font-medium text-soft">
          Estudando
          <Select
            aria-label="Estudando"
            className="w-full"
            value={linkSelected}
            disabled={active !== null}
            onChange={(e) => setLinkValue(e.target.value)}
            options={[{ value: '', label: 'Foco livre (sem vínculo)' }]}
            groups={linkGroups}
          />
        </label>

        <div className="flex flex-col items-center gap-1">
          <Checkbox
            plain
            label="Travar tela"
            checked={lockOn}
            onChange={(e) =>
              active ? setFocusLocked(e.target.checked) : setLockChoice(e.target.checked)
            }
          />
          <p className="text-center text-sm text-muted">
            Com a trava ligada e o cronômetro em andamento, o resto do app fica inacessível (barra
            lateral e topo somem, a tela cheia é pedida). Para destravar, segure o botão por 3
            segundos — a sessão continua.
          </p>
        </div>

        {locked && <HoldToUnlock onUnlock={() => setFocusLocked(false)} />}

        {!wakeLockSupported() && (
          <p className="flex items-center gap-2 text-sm text-muted" role="note">
            <TriangleAlert aria-hidden strokeWidth={1.5} className="size-icon-sm shrink-0" />
            Este navegador não permite manter a tela ligada: ela pode apagar durante a sessão.
          </p>
        )}
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

/** Botão discreto exibido quando o usuário sai da tela cheia com Esc (o app continua travado). */
function ReturnToFullscreen() {
  return (
    <Button
      variant="outline"
      className="h-control-sm px-3 text-sm"
      onClick={() => setFocusLocked(true)}
    >
      <Lock aria-hidden strokeWidth={1.5} className="size-icon-sm" />
      Voltar à tela cheia
    </Button>
  );
}
