import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { cn } from '../../lib/cn';
import { isStandalone, usePwa } from '../../lib/pwa/pwa-store';
import { requestPersistentStorage } from '../../lib/pwa/storage';
import { Button } from '../ui/Button';

/** Instalação disponível agora: o navegador ofereceu o evento e o app ainda não está instalado. */
export function useCanInstall(): boolean {
  const event = usePwa((s) => s.installEvent);
  const [standalone, setStandalone] = useState(() => isStandalone());

  useEffect(() => {
    const query = window.matchMedia('(display-mode: standalone)');
    const onChange = () => setStandalone(isStandalone());
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return event !== null && !standalone;
}

export async function installApp(): Promise<void> {
  const event = usePwa.getState().installEvent;
  if (!event) return;
  await event.prompt();
  const { outcome } = await event.userChoice;
  usePwa.getState().setInstallEvent(null); // o evento só vale uma vez
  if (outcome === 'accepted') void requestPersistentStorage();
}

interface InstallButtonProps {
  /** Só o ícone (sidebar recolhida). */
  collapsed?: boolean;
  className?: string;
}

/** “Instalar app”: só aparece quando o navegador oferece a instalação. */
export function InstallButton({ collapsed = false, className }: InstallButtonProps) {
  const canInstall = useCanInstall();
  if (!canInstall) return null;
  return (
    <Button
      variant="secondary"
      aria-label="Instalar app"
      title="Instalar o Daily como aplicativo"
      className={cn(collapsed && 'w-control px-0', className)}
      onClick={() => void installApp()}
    >
      <Download aria-hidden strokeWidth={1.5} className="size-icon" />
      {!collapsed && 'Instalar app'}
    </Button>
  );
}
