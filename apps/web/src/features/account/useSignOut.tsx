import { useState, type ReactNode } from 'react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { signOutAndWipe } from '../../lib/sync/runtime';
import { useToasts } from '../../lib/toast-store';

/**
 * Sair da conta. Sai direto quando tudo está sincronizado; com alterações não enviadas
 * (ex.: sem internet) pede confirmação, porque sair apaga os dados deste dispositivo.
 */
export function useSignOut(): { signOut: () => void; dialog: ReactNode } {
  const [unsynced, setUnsynced] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (force: boolean) => {
    setBusy(true);
    try {
      const result = await signOutAndWipe(force);
      if (result === 'unsynced') setUnsynced(true);
      else {
        setUnsynced(false);
        useToasts.getState().push({ message: 'Você saiu da conta', durationMs: 4000 });
      }
    } finally {
      setBusy(false);
    }
  };

  const dialog = unsynced ? (
    <Modal
      title="Há alterações não enviadas"
      onClose={() => setUnsynced(false)}
      footer={
        <>
          <Button variant="secondary" onClick={() => setUnsynced(false)}>
            Cancelar
          </Button>
          <Button disabled={busy} onClick={() => void run(true)}>
            Sair e descartar
          </Button>
        </>
      }
    >
      <p className="pb-2 text-md text-soft">
        Não foi possível enviar as últimas alterações para a nuvem (talvez sem conexão). Sair agora
        apaga os dados deste dispositivo e essas alterações serão <strong>perdidas</strong>. Volte a
        ficar online para sincronizar antes de sair.
      </p>
    </Modal>
  ) : null;

  return { signOut: () => void run(false), dialog };
}
