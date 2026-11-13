import { useId, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useData } from '../../lib/data/app-store';
import { dayKey } from '../../lib/dates';
import { appNow } from '../../lib/fixture';
import { MANUAL_FOCUS_MAX_MINUTES, parseManualMinutes } from '../../lib/focus/manual';
import { useToasts } from '../../lib/toast-store';

/** Registrar tempo de foco à mão: data, duração e nota (Perfil e Modo Foco). */
export function FocusLogModal({ onClose }: { onClose: () => void }) {
  const formId = useId();
  const today = dayKey(appNow());
  const [date, setDate] = useState(today);
  const [duration, setDuration] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ date?: string; duration?: string }>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const minutes = parseManualMinutes(duration);
    const next: typeof errors = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = 'Informe uma data válida.';
    else if (date > today) next.date = 'O registro não pode ser no futuro.';
    if (minutes === null || minutes < 1 || minutes > MANUAL_FOCUS_MAX_MINUTES) {
      next.duration = 'Informe a duração, ex.: 45, 1:30 ou 1h30.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0 || minutes === null) return;
    const saved = useData.getState().addManualFocus({ date, minutes, note });
    if (saved) useToasts.getState().push({ message: 'Tempo de foco registrado' });
    onClose();
  };

  return (
    <Modal
      title="Registrar tempo"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId}>
            Registrar
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4 pb-2">
        <TextField
          label="Data"
          type="date"
          max={today}
          value={date}
          error={errors.date}
          onChange={(e) => setDate(e.target.value)}
        />
        <TextField
          label="Duração"
          data-autofocus
          inputMode="text"
          placeholder="ex.: 45, 1:30 ou 1h30"
          hint="Minutos, ou horas e minutos."
          value={duration}
          error={errors.duration}
          onChange={(e) => setDuration(e.target.value)}
        />
        <TextField
          label="Nota (opcional)"
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </form>
    </Modal>
  );
}
