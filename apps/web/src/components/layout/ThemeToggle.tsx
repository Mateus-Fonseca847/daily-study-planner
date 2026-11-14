import { Moon, Sun } from 'lucide-react';
import { cn } from '../../lib/cn';
import { toggledChoice } from '../../lib/theme/theme';
import { useTheme } from '../../lib/theme/theme-store';
import { Button } from '../ui/Button';

/** Rótulo da ação do atalho: o tema para o qual ele leva. */
export const themeToggleLabel = (theme: 'light' | 'dark') =>
  theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro';

/**
 * Atalho sol/lua da topbar: alterna entre claro e escuro a partir do tema na tela e grava a escolha
 * manual (voltar a “Sistema” é em Preferências → Aparência).
 */
export function ThemeToggle() {
  const theme = useTheme((s) => s.theme);
  const setChoice = useTheme((s) => s.setChoice);
  const Icon = theme === 'dark' ? Sun : Moon;
  return (
    <Button
      variant="icon"
      data-theme-toggle
      aria-label={themeToggleLabel(theme)}
      title={themeToggleLabel(theme)}
      onClick={() => setChoice(toggledChoice(theme))}
    >
      <Icon aria-hidden strokeWidth={1.5} className="size-icon" />
    </Button>
  );
}

/** O mesmo atalho como linha de lista (sheet “Mais” do celular). */
export function ThemeToggleRow({ className }: { className: string }) {
  const theme = useTheme((s) => s.theme);
  const setChoice = useTheme((s) => s.setChoice);
  const Icon = theme === 'dark' ? Sun : Moon;
  return (
    <button
      type="button"
      data-theme-toggle
      className={cn(className, 'text-fg')}
      onClick={() => setChoice(toggledChoice(theme))}
    >
      <Icon aria-hidden strokeWidth={1.5} className="size-icon shrink-0" />
      <span className="flex-1 truncate">{themeToggleLabel(theme)}</span>
    </button>
  );
}
