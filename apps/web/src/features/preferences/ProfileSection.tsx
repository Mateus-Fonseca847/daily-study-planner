import { useState, type FormEvent } from 'react';
import { preferencesSchema } from '@daily/shared';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { TextField } from '../../components/ui/Field';
import { useData } from '../../lib/data/app-store';
import { useToasts } from '../../lib/toast-store';

type Field = 'name' | 'waterGoalMl' | 'cupMl';

/** Nome, meta de água, copo, duração padrão do foco e “Travar por padrão”. */
export function ProfileSection() {
  const saved = useData((s) => s.preferences);
  const updatePreferences = useData((s) => s.updatePreferences);
  const [values, setValues] = useState({
    name: saved.name,
    waterGoalMl: String(saved.waterGoalMl),
    cupMl: String(saved.cupMl),
    lockByDefault: saved.lockByDefault,
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  const set = (patch: Partial<typeof values>) => setValues((v) => ({ ...v, ...patch }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = preferencesSchema.safeParse({
      name: values.name,
      waterGoalMl: values.waterGoalMl.trim() === '' ? NaN : Number(values.waterGoalMl),
      cupMl: values.cupMl.trim() === '' ? NaN : Number(values.cupMl),
      focusDurationSec: saved.focusDurationSec,
      lockByDefault: values.lockByDefault,
    });
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as Field;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    updatePreferences(parsed.data);
    useToasts.getState().push({ message: 'Preferências salvas', durationMs: 4000 });
  };

  return (
    <section
      aria-labelledby="profile-title"
      className="flex flex-col gap-4 rounded-xl border-hair p-6"
    >
      <div>
        <h2 id="profile-title" className="text-lg font-semibold tracking-tight">
          Perfil e Modo Foco
        </h2>
        <p className="mt-1 text-md text-muted">
          Usado na saudação e nas metas de água. A duração do Modo Foco é a última que você
          confirmou lá.
        </p>
      </div>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField
          label="Nome"
          value={values.name}
          error={errors.name}
          onChange={(e) => set({ name: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Meta de água (ml)"
            type="number"
            inputMode="numeric"
            value={values.waterGoalMl}
            error={errors.waterGoalMl}
            onChange={(e) => set({ waterGoalMl: e.target.value })}
          />
          <TextField
            label="Tamanho do copo (ml)"
            type="number"
            inputMode="numeric"
            value={values.cupMl}
            error={errors.cupMl}
            onChange={(e) => set({ cupMl: e.target.value })}
          />
        </div>
        <Checkbox
          plain
          label="Travar por padrão"
          checked={values.lockByDefault}
          onChange={(e) => set({ lockByDefault: e.target.checked })}
        />
        <Button type="submit" className="self-start">
          Salvar preferências
        </Button>
      </form>
    </section>
  );
}
