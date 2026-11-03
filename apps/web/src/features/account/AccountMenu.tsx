import { LogIn, LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Menu } from '../../components/ui/Menu';
import { useAuth } from '../../lib/auth/auth-store';
import { useSync } from '../../lib/sync/sync-store';
import { PHASE_LABEL } from './SyncStatusLabel';
import { useSignOut } from './useSignOut';

/** Topbar: “Entrar” para visitantes; avatar com estado de sincronização para quem tem conta. */
export function AccountMenu() {
  const auth = useAuth();
  const phase = useSync((s) => s.phase);
  const navigate = useNavigate();
  const { signOut, dialog } = useSignOut();

  if (auth.status === 'disabled' || auth.status === 'loading') return null;

  if (auth.status === 'visitor') {
    return (
      <Button variant="outline" onClick={() => navigate('/entrar')}>
        Entrar
        <LogIn aria-hidden strokeWidth={1.5} className="size-icon" />
      </Button>
    );
  }

  const { user } = auth;
  return (
    <>
      <span role="status" className="hidden text-sm text-muted xl:inline">
        {PHASE_LABEL[phase]}
      </span>
      <Menu
        label="Conta"
        align="end"
        items={[
          {
            label: 'Conta e sincronização',
            icon: Settings,
            onSelect: () => navigate('/preferencias'),
          },
          { label: 'Sair', icon: LogOut, onSelect: signOut },
        ]}
        trigger={(props) => (
          <Button
            variant="icon"
            size="sm"
            aria-label={`Conta de ${user.email || user.name}`}
            title={user.email}
            {...props}
          >
            <Avatar name={user.name || user.email} />
          </Button>
        )}
      />
      {dialog}
    </>
  );
}
