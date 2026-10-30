import { WifiOff } from 'lucide-react';
import { useOnline } from '../../lib/pwa/use-pwa';

/** Indicador discreto na topbar: sem conexão o app segue 100 % funcional. */
export function OfflineBadge() {
  const online = useOnline();
  if (online) return null;
  return (
    <span
      role="status"
      title="Sem conexão: o Daily continua funcionando normalmente."
      className="inline-flex h-control-sm items-center gap-1.5 rounded-full border-hair px-3 text-xs font-medium text-muted"
    >
      <WifiOff aria-hidden strokeWidth={1.5} className="size-icon-sm" />
      Offline
    </span>
  );
}
