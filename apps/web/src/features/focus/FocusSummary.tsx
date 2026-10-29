import { Link } from 'react-router-dom';
import { CircleCheck, TimerOff } from 'lucide-react';
import type { FocusSession } from '@daily/shared';
import { Button } from '../../components/ui/Button';
import { useData } from '../../lib/data/app-store';
import { formatFocused } from '../../lib/focus/format';
import { describeLink } from '../../lib/focus/link';
import { useFocusUi } from '../../lib/focus/focus-ui-store';
import { useToasts } from '../../lib/toast-store';

/** Tela exibida depois da sessão: quanto tempo foi focado, vínculo e próximos passos. */
export function FocusSummary({ session }: { session: FocusSession }) {
  const subjects = useData((s) => s.subjects);
  const events = useData((s) => s.events);
  const setEventStatus = useData((s) => s.setEventStatus);
  const setSummary = useFocusUi((s) => s.setSummary);
  const completed = session.status === 'concluida';
  const linkText = describeLink(session, subjects, events);
  const block = events.find((e) => e.id === session.blockId);
  const canCompleteBlock = completed && block !== undefined && block.status !== 'concluido';
  const Icon = completed ? CircleCheck : TimerOff;

  return (
    <section
      aria-labelledby="focus-summary-title"
      className="flex max-w-modal flex-col items-center gap-3 text-center"
    >
      <Icon
        aria-hidden
        strokeWidth={1.5}
        className={completed ? 'size-avatar-md text-timer-done' : 'size-avatar-md text-muted'}
      />
      <h1 id="focus-summary-title" className="text-xl font-semibold tracking-tighter">
        Você focou {formatFocused(session.actualSec)}
      </h1>
      <p className="text-md text-muted">
        {completed ? 'Sessão concluída.' : 'Sessão interrompida antes do fim.'}
        {linkText && <> {linkText}.</>}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {canCompleteBlock && block && (
          <Button
            variant="secondary"
            onClick={() => {
              setEventStatus(block.id, 'concluido');
              useToasts
                .getState()
                .push({ message: `Bloco “${block.title}” concluído`, durationMs: 4000 });
            }}
          >
            Marcar bloco como concluído
          </Button>
        )}
        <Button onClick={() => setSummary(null)}>Nova sessão</Button>
        <Link
          to="/estatisticas"
          className="inline-flex h-control items-center rounded-full border-hair border-line-strong px-4 text-md font-medium text-fg hover:bg-hover"
        >
          Ver estatísticas
        </Link>
      </div>
    </section>
  );
}
