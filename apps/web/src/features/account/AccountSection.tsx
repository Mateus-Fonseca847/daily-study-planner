import { useState } from 'react';
import { Cloud, LogIn, LogOut, RefreshCw, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../lib/auth/auth-store';
import { getSupabase } from '../../lib/cloud/client';
import { signOutAndWipe, syncNow } from '../../lib/sync/runtime';
import { useSync } from '../../lib/sync/sync-store';
import { useToasts } from '../../lib/toast-store';
import { PHASE_LABEL } from './SyncStatusLabel';
import { useSignOut } from './useSignOut';

/** Preferências → Conta: login, estado da sincronização e exclusão da conta. */
export function AccountSection() {
  const auth = useAuth();
  const sync = useSync();
  const { signOut, dialog } = useSignOut();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (auth.status === 'disabled' || auth.status === 'loading') return null;

  const deleteAccount = async () => {
    setBusy(true);
    setError(null);
    const { error: rpcError } = (await getSupabase()?.rpc('delete_my_account')) ?? {
      error: { message: 'Nuvem indisponível.' },
    };
    if (rpcError) {
      setError(`Não foi possível excluir: ${rpcError.message}`);
      setBusy(false);
      return;
    }
    await signOutAndWipe(true);
    setConfirmDelete(false);
    setBusy(false);
    useToasts.getState().push({ message: 'Conta e dados da nuvem excluídos', durationMs: 5000 });
  };

  return (
    <section
      aria-labelledby="account-title"
      className="flex flex-col gap-4 rounded-xl border-hair p-6"
    >
      <h2 id="account-title" className="text-lg font-semibold tracking-tight">
        Conta e sincronização
      </h2>

      {auth.status === 'visitor' ? (
        <>
          <p className="text-md text-muted">
            Você está usando o Daily sem conta: os dados ficam só neste navegador. Entre com o
            Google para guardá-los na nuvem e abrir em outros dispositivos.
          </p>
          <Link
            to="/entrar"
            className="inline-flex h-control w-fit items-center gap-2 rounded-full bg-accent px-5 text-nav font-semibold text-accent-fg hover:brightness-95"
          >
            <LogIn aria-hidden strokeWidth={1.5} className="size-icon" />
            Entrar
          </Link>
        </>
      ) : (
        <>
          <p className="text-md">
            <span className="text-muted">Conectado como </span>
            <strong>{auth.user.email}</strong>
          </p>
          <p role="status" className="flex items-center gap-2 text-md text-muted">
            <Cloud aria-hidden strokeWidth={1.5} className="size-icon" />
            {PHASE_LABEL[sync.phase]}
            {sync.lastSyncedAt &&
              sync.phase === 'synced' &&
              ` · ${new Date(sync.lastSyncedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
            {sync.message && ` — ${sync.message}`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void syncNow()}>
              <RefreshCw aria-hidden strokeWidth={1.5} className="size-icon" />
              Sincronizar agora
            </Button>
            <Button variant="secondary" onClick={signOut}>
              <LogOut aria-hidden strokeWidth={1.5} className="size-icon" />
              Sair
            </Button>
            <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
              <Trash2 aria-hidden strokeWidth={1.5} className="size-icon" />
              Excluir minha conta
            </Button>
          </div>
          <p className="text-md text-muted">
            Ao sair, os dados deste dispositivo são removidos (continuam na nuvem). Veja a{' '}
            <Link to="/privacidade" className="underline">
              política de privacidade
            </Link>
            .
          </p>
        </>
      )}

      {dialog}
      {confirmDelete && (
        <Modal
          title="Excluir conta?"
          onClose={() => setConfirmDelete(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </Button>
              <Button disabled={busy} onClick={() => void deleteAccount()}>
                Excluir definitivamente
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-2 pb-2">
            <p className="text-md text-soft">
              Isto apaga sua conta e <strong>todos os dados guardados na nuvem</strong>, e remove os
              dados deste dispositivo. Não há como desfazer. Exporte um backup antes se quiser
              guardar uma cópia.
            </p>
            {error && (
              <p role="alert" className="text-md text-danger">
                {error}
              </p>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}
