import { create } from 'zustand';
import { browserStorage } from '../browser-storage';
import { switchTheme } from './apply';
import {
  DARK_QUERY,
  parseChoice,
  readChoice,
  resolveTheme,
  THEME_KEY,
  writeChoice,
  type Theme,
  type ThemeChoice,
} from './theme';

const prefersDark = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(DARK_QUERY).matches
    : true;

interface ThemeState {
  /** O que o usuário escolheu (por dispositivo). */
  choice: ThemeChoice;
  /** O tema na tela agora. */
  theme: Theme;
  setChoice(choice: ThemeChoice): void;
}

const initialChoice = readChoice(browserStorage());

/** Tema do app. `public/theme-init.js` já aplicou o mesmo resultado antes da 1ª pintura. */
export const useTheme = create<ThemeState>()((set) => ({
  choice: initialChoice,
  theme: resolveTheme(initialChoice, prefersDark()),
  setChoice: (choice) => {
    writeChoice(browserStorage(), choice);
    const theme = resolveTheme(choice, prefersDark());
    switchTheme(document, theme, choice);
    set({ choice, theme });
  },
}));

/**
 * Liga o tema ao documento e ao sistema: aplica o estado atual e, em “Sistema”, acompanha
 * `prefers-color-scheme` sem recarregar. Devolve a função que desliga.
 */
export function startTheme(): () => void {
  const { choice, theme } = useTheme.getState();
  switchTheme(document, theme, choice);
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(DARK_QUERY);
  const onChange = (event: MediaQueryListEvent) => {
    const { choice: current } = useTheme.getState();
    if (current !== 'sistema') return;
    const next = resolveTheme(current, event.matches);
    switchTheme(document, next, current);
    useTheme.setState({ theme: next });
  };
  // Outra aba mudou a escolha: esta acompanha.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_KEY) return;
    const next = parseChoice(event.newValue);
    if (!next) return;
    const theme = resolveTheme(next, query.matches);
    switchTheme(document, theme, next);
    useTheme.setState({ choice: next, theme });
  };
  query.addEventListener('change', onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    query.removeEventListener('change', onChange);
    window.removeEventListener('storage', onStorage);
  };
}
