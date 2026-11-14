import { useState } from 'react';
import type { Recurrence } from '@daily/shared';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { setRecurrenceWithUndo } from '../../lib/data/actions';
import { RepeatPicker } from './RepeatPicker';

interface RepeatDialogProps {
  /** Série ou tarefa avulsa (o id do evento salvo, não o da ocorrência). */
  eventId: string;
  title: string;
  /** Data inicial da série (ou o dia da tarefa avulsa). */
  anchor: string;
  value: Recurrence | null;
  onClose: () => void;
}

/** “Repetir…” do menu “…”: a mesma escolha do painel, sem abrir o painel completo. */
export function RepeatDialog({ eventId, title, anchor, value, onClose }: RepeatDialogProps) {
  const [rule, setRule] = useState<Recurrence | null>(value);
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal
      title={`Repetir “${title}”`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={error !== null}
            onClick={() => {
              setRecurrenceWithUndo(eventId, rule);
              onClose();
            }}
          >
            Aplicar
          </Button>
        </>
      }
    >
      <RepeatPicker
        value={rule}
        anchor={anchor}
        onChange={(next, problem) => {
          setRule(next);
          setError(problem);
        }}
      />
    </Modal>
  );
}
