import { useId } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Checkbox } from '../../components/ui/Checkbox';
import { cn } from '../../lib/cn';
import type { UsernameCheck } from './useUsernameCheck';

/** Campo do @ com o prefixo, as regras visíveis e o resultado da verificação. */
export function UsernameField({
  value,
  onChange,
  check,
  label = 'Seu @',
}: {
  value: string;
  onChange: (value: string) => void;
  check: UsernameCheck;
  label?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-md font-medium">
        {label}
      </label>
      <div className="flex h-select items-center rounded-md border-hair bg-raised px-3 focus-within:outline-2 focus-within:outline-focus-ring">
        <span aria-hidden className="text-md text-muted">
          @
        </span>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={30}
          aria-describedby={`${id}-status ${id}-rules`}
          aria-invalid={check.state === 'problema' ? true : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-md outline-none focus-visible:outline-none! focus-visible:shadow-none!"
        />
      </div>
      <p id={`${id}-status`} aria-live="polite" className="min-h-5 text-sm">
        {check.state === 'checando' && (
          <span className="inline-flex items-center gap-1 text-muted">
            <Loader2
              aria-hidden
              strokeWidth={1.5}
              className="size-icon-sm motion-safe:animate-spin"
            />
            Verificando…
          </span>
        )}
        {check.state === 'livre' && (
          <span className="inline-flex items-center gap-1 text-concluido">
            <Check aria-hidden strokeWidth={2} className="size-icon-sm" />
            Disponível
          </span>
        )}
        {check.state === 'problema' && <span className="text-danger">{check.message}</span>}
      </p>
      <p id={`${id}-rules`} className="text-sm text-muted">
        De 3 a 20 caracteres: letras sem acento (a–z), números, ponto e sublinhado. Comece e termine
        com letra ou número.
      </p>
    </div>
  );
}

export interface PrivacyValues {
  discoverable: boolean;
  showAchievements: boolean;
  showStreaks: boolean;
  showStats: boolean;
}

const TOGGLES: readonly { key: keyof PrivacyValues; label: string; teenLocked: boolean }[] = [
  {
    key: 'discoverable',
    label: 'Aparecer na busca (quando a busca existir)',
    teenLocked: true,
  },
  { key: 'showAchievements', label: 'Mostrar medalhas em destaque', teenLocked: false },
  { key: 'showStreaks', label: 'Mostrar sequências', teenLocked: true },
  { key: 'showStats', label: 'Mostrar estatísticas', teenLocked: true },
];

/** Interruptores de privacidade; para 14 a 17 anos, os extras ficam desligados e travados. */
export function PrivacyToggles({
  values,
  onChange,
  teen,
  disabled,
}: {
  values: PrivacyValues;
  onChange: (key: keyof PrivacyValues, value: boolean) => void;
  teen: boolean;
  disabled?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-1 text-md font-medium">Privacidade</legend>
      {TOGGLES.map((t) => {
        const locked = teen && t.teenLocked;
        return (
          <div key={t.key} className={cn(locked && 'opacity-dimmed')}>
            <Checkbox
              plain
              label={t.label}
              checked={values[t.key]}
              disabled={locked || disabled}
              onChange={(e) => onChange(t.key, e.target.checked)}
            />
          </div>
        );
      })}
      {teen && (
        <p className="text-sm text-soft">
          Para menores de 18 anos, busca, sequências e estatísticas ficam desligadas.
        </p>
      )}
    </fieldset>
  );
}
