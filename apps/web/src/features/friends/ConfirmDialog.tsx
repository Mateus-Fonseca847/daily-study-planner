import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { friendlyError } from './FriendsGate';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  busyLabel: string;
  onClose: () => void;
  /** Rejeita com a mensagem do servidor: o diálogo fica aberto e a mostra. */
  onConfirm: () => Promise<void>;
}

/** Confirmação para ações que não têm “Desfazer” (desfazer amizade, bloquear, recusar). */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  busyLabel,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError(null);
              onConfirm()
                .then(onClose)
                .catch((e: unknown) => {
                  setError(friendlyError(e));
                  setBusy(false);
                });
            }}
          >
            {busy ? busyLabel : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-md text-soft">{description}</p>
      {error && (
        <p role="alert" className="mt-3 text-md text-danger">
          {error}
        </p>
      )}
    </Modal>
  );
}
