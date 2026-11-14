import { useId, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { cn } from '../../lib/cn';
import type { EditScope } from '../../lib/data/series';

interface ScopeDialogProps {
  mode: 'editar' | 'excluir';
  /** Data da ocorrência, já formatada (“segunda, 16/11”). */
  when: string;
  /** “Somente esta” fica indisponível quando a mudança não é pontual (tipo, matéria, repetição). */
  allowThis?: boolean;
  onConfirm: (scope: EditScope) => void;
  onClose: () => void;
}

const OPTIONS: { value: EditScope; label: string; hint: string }[] = [
  { value: 'esta', label: 'Somente esta', hint: 'Só a ocorrência deste dia.' },
  { value: 'proximas', label: 'Esta e as próximas', hint: 'Daqui em diante; as anteriores ficam.' },
  { value: 'todas', label: 'Todas', hint: 'A série inteira.' },
];

/** Pergunta o escopo de uma edição ou exclusão numa tarefa recorrente. */
export function ScopeDialog({
  mode,
  when,
  allowThis = true,
  onConfirm,
  onClose,
}: ScopeDialogProps) {
  const name = useId();
  const [scope, setScope] = useState<EditScope>(allowThis ? 'esta' : 'proximas');
  const title = mode === 'editar' ? 'Salvar alteração em…' : 'Excluir…';
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Voltar
          </Button>
          <Button onClick={() => onConfirm(scope)}>
            {mode === 'editar' ? 'Salvar' : 'Excluir'}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-md text-soft">Tarefa recorrente · ocorrência de {when}.</p>
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Escopo</legend>
        {OPTIONS.map((o) => {
          const disabled = o.value === 'esta' && !allowThis;
          return (
            <label
              key={o.value}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-card-sm border-hair p-3 coarse:min-h-touch',
                scope === o.value && 'border-accent-ink',
                disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={scope === o.value}
                disabled={disabled}
                onChange={() => setScope(o.value)}
                className="mt-1 size-checkbox accent-accent-ink"
              />
              <span className="flex flex-col">
                <span className="text-md font-medium">{o.label}</span>
                <span className="text-sm text-muted">
                  {disabled ? 'Tipo, matéria, repetição e subtarefas valem para a série.' : o.hint}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>
    </Modal>
  );
}
