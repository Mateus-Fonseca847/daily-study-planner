import { useId, useState } from 'react';
import { REPORT_DETAIL_MAX, REPORT_REASONS, type ReportReason } from '@daily/shared';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { TextAreaField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { SocialError } from '../../lib/social/errors';
import type { Person } from '../../lib/social/friends-repository';
import { useFriends } from '../../lib/social/friends-store';
import { useToasts } from '../../lib/toast-store';
import { friendlyError } from './FriendsGate';

/** Mensagem do limite de denúncias (o código `limite` é genérico; aqui o contexto é claro). */
export const REPORT_LIMIT_MESSAGE =
  'Você atingiu o limite de 5 denúncias por dia. Se for urgente, bloqueie a pessoa agora.';
export const REPORT_SENT_MESSAGE = 'Denúncia enviada. Obrigado por ajudar a manter o Daily seguro.';

interface ReportDialogProps {
  target: Person;
  onClose: () => void;
}

/** Denunciar: motivo, detalhe opcional (até 500) e “Bloquear também” (marcado por padrão). */
export function ReportDialog({ target, onClose }: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const report = useFriends((s) => s.report);
  const name = useId();
  const counterId = useId();
  const tooLong = detail.trim().length > REPORT_DETAIL_MAX;

  const submit = () => {
    if (!reason || tooLong) return;
    setBusy(true);
    setError(null);
    report(target, { reason, detail, alsoBlock })
      .then(() => {
        useToasts.getState().push({ message: REPORT_SENT_MESSAGE });
        onClose();
      })
      .catch((e: unknown) => {
        setError(
          e instanceof SocialError && e.kind === 'limite' ? REPORT_LIMIT_MESSAGE : friendlyError(e),
        );
        setBusy(false);
      });
  };

  return (
    <Modal
      title={`Denunciar @${target.username}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!reason || tooLong || busy}>
            {busy ? 'Enviando…' : 'Enviar denúncia'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-md text-soft">
          A denúncia é analisada pela equipe do Daily. @{target.username} não fica sabendo quem
          denunciou.
        </p>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm text-muted">Motivo</legend>
          {REPORT_REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-3 text-md coarse:min-h-touch">
              <input
                type="radio"
                name={name}
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="size-checkbox shrink-0 accent-accent-ink"
              />
              {r.label}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-col gap-1">
          <TextAreaField
            label="Detalhes (opcional)"
            value={detail}
            maxLength={REPORT_DETAIL_MAX}
            onChange={(e) => setDetail(e.target.value)}
            aria-describedby={counterId}
            error={tooLong ? `No máximo ${REPORT_DETAIL_MAX} caracteres.` : undefined}
          />
          <p id={counterId} className="self-end text-sm text-muted">
            {detail.trim().length}/{REPORT_DETAIL_MAX}
          </p>
        </div>
        <Checkbox
          plain
          label="Bloquear também"
          checked={alsoBlock}
          onChange={(e) => setAlsoBlock(e.target.checked)}
        />
        {error && (
          <p role="alert" className="text-md text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
