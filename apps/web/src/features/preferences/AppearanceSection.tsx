import { SegmentedControl } from '../../components/ui/SegmentedControl';
import type { ThemeChoice } from '../../lib/theme/theme';
import { useTheme } from '../../lib/theme/theme-store';

const OPTIONS: readonly { value: ThemeChoice; label: string }[] = [
  { value: 'sistema', label: 'Sistema' },
  { value: 'claro', label: 'Claro' },
  { value: 'escuro', label: 'Escuro' },
];

/** Preferências → Aparência: Sistema | Claro | Escuro, guardado só neste dispositivo. */
export function AppearanceSection() {
  const choice = useTheme((s) => s.choice);
  const setChoice = useTheme((s) => s.setChoice);
  return (
    <section
      aria-labelledby="appearance-title"
      data-appearance
      className="flex flex-col gap-3 rounded-xl border-hair p-6 phone:p-4"
    >
      <h2 id="appearance-title" className="text-lg font-semibold tracking-tight">
        Aparência
      </h2>
      <p id="appearance-hint" className="text-md text-muted">
        “Sistema” acompanha o claro ou escuro do aparelho. A escolha vale só neste dispositivo.
      </p>
      <div className="self-start phone:self-stretch">
        <SegmentedControl aria-label="Tema" options={OPTIONS} value={choice} onChange={setChoice} />
      </div>
    </section>
  );
}
