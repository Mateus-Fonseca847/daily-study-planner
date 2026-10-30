import { useRef, useState, type ChangeEvent } from 'react';
import { Download, Upload } from 'lucide-react';
import type { DataSnapshot } from '@daily/shared';
import { PageShell } from '../../components/layout/PageShell';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { createBackupFile, readBackupFile } from '../../lib/data/backup';
import { useData } from '../../lib/data/app-store';
import { appNow } from '../../lib/fixture';
import { useToasts } from '../../lib/toast-store';
import { AccountSection } from '../account/AccountSection';
import { AppSection } from './AppSection';
import { ProfileSection } from './ProfileSection';

function download(filename: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function PreferencesPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<DataSnapshot | null>(null);
  const current = {
    subjects: useData((s) => s.subjects.length),
    events: useData((s) => s.events.length),
  };

  const exportData = () => {
    const file = createBackupFile(useData.getState().snapshot(), appNow());
    download(file.filename, file.content);
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite escolher o mesmo arquivo de novo
    if (!file) return;
    setError(null);
    const result = readBackupFile(await file.text());
    if (result.ok) setPending(result.snapshot);
    else setError(`Arquivo rejeitado: ${result.error}`);
  };

  const confirmImport = () => {
    if (!pending) return;
    useData.getState().replaceAll(pending);
    useToasts.getState().push({ message: 'Dados importados', durationMs: 4000 });
    setPending(null);
  };

  return (
    <PageShell title="Preferências" description="Perfil, Modo Foco e backup dos seus dados.">
      <AccountSection />
      <ProfileSection />
      <AppSection onExport={exportData} />
      <section
        aria-labelledby="backup-title"
        className="flex flex-col gap-3 rounded-xl border-hair p-6"
      >
        <h2 id="backup-title" className="text-lg font-semibold tracking-tight">
          Backup
        </h2>
        <p className="text-md text-muted">
          Seus dados ficam neste navegador (e na nuvem, se você entrou na conta) ({current.subjects}{' '}
          matérias, {current.events} eventos). Exporte um arquivo JSON para guardar uma cópia ou
          levar para outro computador.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportData}>
            <Download aria-hidden strokeWidth={1.5} className="size-icon" />
            Exportar dados (JSON)
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload aria-hidden strokeWidth={1.5} className="size-icon" />
            Importar dados (JSON)
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            aria-label="Arquivo de backup"
            className="sr-only"
            tabIndex={-1}
            onChange={onFile}
          />
        </div>
        {error && (
          <p role="alert" className="text-md text-danger">
            {error}
          </p>
        )}
      </section>

      {pending && (
        <Modal
          title="Importar dados?"
          onClose={() => setPending(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setPending(null)}>
                Cancelar
              </Button>
              <Button onClick={confirmImport}>Substituir meus dados</Button>
            </>
          }
        >
          <p className="pb-2 text-md text-soft">
            Isto <strong>substitui</strong> os dados atuais ({current.subjects} matérias,{' '}
            {current.events} eventos) pelos do arquivo ({pending.subjects.length} matérias,{' '}
            {pending.events.length} eventos). Exporte antes se quiser guardar os atuais.
          </p>
        </Modal>
      )}
    </PageShell>
  );
}
