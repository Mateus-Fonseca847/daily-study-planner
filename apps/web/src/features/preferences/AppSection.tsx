import { useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { InstallButton, useCanInstall } from '../../components/layout/InstallButton';
import { Button } from '../../components/ui/Button';
import { isStandalone, usePwa } from '../../lib/pwa/pwa-store';
import {
  formatBytes,
  readStorageStatus,
  requestPersistentStorage,
  type StorageStatus,
} from '../../lib/pwa/storage';
import { canOfferUpdate } from '../../lib/pwa/update-policy';
import { useData } from '../../lib/data/app-store';

interface AppSectionProps {
  onExport: () => void;
}

/** Instalação como app, armazenamento persistente e atualização. */
export function AppSection({ onExport }: AppSectionProps) {
  const canInstall = useCanInstall();
  const needRefresh = usePwa((s) => s.needRefresh);
  const focus = useData((s) => s.focusActive);
  const [status, setStatus] = useState<StorageStatus | null>(null);

  useEffect(() => {
    let alive = true;
    void readStorageStatus().then((next) => alive && setStatus(next));
    return () => {
      alive = false;
    };
  }, []);

  const persist = async () => {
    await requestPersistentStorage();
    setStatus(await readStorageStatus());
  };

  const installed = isStandalone();
  const persisted = status?.persisted === true;
  const usage =
    status?.usageBytes != null && status.quotaBytes != null
      ? `${formatBytes(status.usageBytes)} de ${formatBytes(status.quotaBytes)}`
      : null;

  return (
    <section aria-labelledby="app-title" className="flex flex-col gap-4 rounded-xl border-hair p-6">
      <h2 id="app-title" className="text-lg font-semibold tracking-tight">
        Aplicativo e armazenamento
      </h2>

      <div className="flex flex-col gap-2">
        <h3 className="text-md font-semibold">Instalar</h3>
        {installed ? (
          <p className="text-md text-muted">O Daily já está instalado neste computador.</p>
        ) : canInstall ? (
          <>
            <p className="text-md text-muted">
              Abre numa janela própria, funciona offline e pode ser fixado na barra de tarefas.
            </p>
            <div>
              <InstallButton />
            </div>
          </>
        ) : (
          <p className="text-md text-muted">
            Este navegador não ofereceu a instalação. No Chrome ou no Edge, use o ícone de instalar
            na barra de endereço ou o menu → “Instalar Daily”. No Safari, use Compartilhar →
            “Adicionar à Tela de Início”; no Firefox, o Daily funciona normalmente na aba.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-md font-semibold">Armazenamento persistente</h3>
        <p className="text-md">
          <span className="text-muted">Situação: </span>
          <strong>{persisted ? 'ativo' : 'não garantido'}</strong>
          {usage && <span className="text-muted"> · espaço usado: {usage}</span>}
        </p>
        <p className="text-md text-muted">
          Seus dados ficam só neste navegador; com o armazenamento persistente ele não os apaga
          quando o disco enche. Mesmo assim, guarde uma cópia.
        </p>
        <div className="flex flex-wrap gap-2">
          {!persisted && (
            <Button variant="secondary" onClick={() => void persist()}>
              Pedir armazenamento persistente
            </Button>
          )}
          <Button variant="secondary" onClick={onExport}>
            <Download aria-hidden strokeWidth={1.5} className="size-icon" />
            Exportar dados
          </Button>
        </div>
      </div>

      {needRefresh && (
        <div className="flex flex-col gap-2">
          <h3 className="text-md font-semibold">Atualização</h3>
          <p className="text-md text-muted">
            {canOfferUpdate(focus)
              ? 'Há uma nova versão do Daily. A página será recarregada.'
              : 'Há uma nova versão do Daily; atualize quando a sessão de foco terminar.'}
          </p>
          <div>
            <Button
              variant="secondary"
              disabled={!canOfferUpdate(focus)}
              onClick={() => void usePwa.getState().applyUpdate?.()}
            >
              <RefreshCw aria-hidden strokeWidth={1.5} className="size-icon" />
              Atualizar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
