import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type { Summary } from '../../lib/sync/engine';
import { resolveConflict } from '../../lib/sync/runtime';
import { useSync } from '../../lib/sync/sync-store';

function SummaryCard({ title, s }: { title: string; s: Summary }) {
  return (
    <div className="flex-1 rounded-lg border-hair p-4">
      <h3 className="text-md font-semibold">{title}</h3>
      <p className="mt-1 text-md text-muted">
        {s.subjects} matérias · {s.events} eventos · {s.habits} hábitos
      </p>
      {s.updatedAt && (
        <p className="mt-1 text-sm text-muted">
          Atualizado em {new Date(s.updatedAt).toLocaleString('pt-BR')}
        </p>
      )}
    </div>
  );
}

/** Aparece quando este dispositivo e a nuvem têm dados diferentes e não dá para decidir sozinho. */
export function ConflictDialog() {
  const conflict = useSync((s) => s.conflict);
  const phase = useSync((s) => s.phase);
  if (phase !== 'conflict' || !conflict) return null;
  return (
    <Modal
      title="Seus dados estão diferentes"
      // Sem “fechar”: enquanto o conflito existir, nada é enviado nem baixado (nada se perde).
      onClose={() => undefined}
      footer={
        <>
          <Button variant="secondary" onClick={() => void resolveConflict('device')}>
            Manter os deste dispositivo
          </Button>
          <Button onClick={() => void resolveConflict('cloud')}>Usar os da nuvem</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 pb-2">
        <p className="text-md text-soft">
          Há dados na sua conta e neste dispositivo, e eles não são iguais. Escolha qual versão
          vale; a outra será substituída. Dica: exporte um backup em Preferências antes, se quiser
          guardar as duas.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <SummaryCard title="Neste dispositivo" s={conflict.device} />
          <SummaryCard title="Na nuvem" s={conflict.cloud} />
        </div>
      </div>
    </Modal>
  );
}
