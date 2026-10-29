import { TriangleAlert } from 'lucide-react';
import { useData } from '../../lib/data/app-store';
import { Button } from '../ui/Button';

/** Avisos de armazenamento: dado corrompido ao carregar e falha ao salvar. */
export function StorageNotices() {
  const issue = useData((s) => s.issue);
  const saveError = useData((s) => s.saveError);
  const restoreBackup = useData((s) => s.restoreBackup);
  const startFresh = useData((s) => s.startFresh);
  const clearSaveError = useData((s) => s.clearSaveError);

  if (!issue && !saveError) return null;
  return (
    <div role="alert" className="flex flex-col gap-2 border-b-hair bg-surface px-page py-3 text-md">
      {issue && (
        <div className="flex flex-wrap items-center gap-3">
          <TriangleAlert aria-hidden strokeWidth={1.5} className="size-icon text-danger" />
          <p className="min-w-0 flex-1">
            Os dados salvos neste navegador estão corrompidos ({issue.message}). O Daily abriu
            vazio; o conteúdo original foi guardado à parte.
          </p>
          {issue.hasBackup && (
            <Button variant="secondary" onClick={() => restoreBackup()}>
              Restaurar último backup
            </Button>
          )}
          <Button variant="secondary" onClick={() => startFresh()}>
            Começar do zero
          </Button>
        </div>
      )}
      {saveError && (
        <div className="flex flex-wrap items-center gap-3">
          <TriangleAlert aria-hidden strokeWidth={1.5} className="size-icon text-danger" />
          <p className="min-w-0 flex-1">{saveError} Exporte seus dados em Preferências.</p>
          <Button variant="secondary" onClick={clearSaveError}>
            Dispensar
          </Button>
        </div>
      )}
    </div>
  );
}
