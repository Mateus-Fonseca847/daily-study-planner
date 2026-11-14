import type { StorageLike } from '../data/local-storage-repository';

/**
 * Tema: escolha do usuário (`sistema | claro | escuro`) e o tema que vale na tela (`light | dark`).
 * A escolha é por dispositivo: fica no armazenamento local, fora do snapshot, do backup e da
 * sincronização. `public/theme-init.js` repete esta lógica (sem módulo, antes da 1ª pintura) e o
 * teste `theme.test.ts` confere que os dois concordam.
 */
export const THEME_CHOICES = ['sistema', 'claro', 'escuro'] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];
export type Theme = 'light' | 'dark';

export const THEME_KEY = 'daily:theme';
/** Chaves de dados do app: se alguma existe, quem abre é um usuário antigo (fica no escuro). */
export const DATA_KEYS = ['daily:v6', 'daily:v5', 'daily:v4', 'daily:v3', 'daily:v2', 'daily:v1'] as const;
/** Cor da barra do sistema e do fundo (`--ds-color-bg` de cada tema; o teste confere com `tokens.css`). */
export const THEME_COLOR: Readonly<Record<Theme, string>> = {
  dark: '#131313', // check-tokens: permitido — theme-color antes do CSS; igual a --ds-color-bg
  light: '#f4f4f6', // check-tokens: permitido — theme-color antes do CSS; igual a --ds-color-bg
};
export const DARK_QUERY = '(prefers-color-scheme: dark)';

export function parseChoice(raw: string | null | undefined): ThemeChoice | null {
  return (THEME_CHOICES as readonly string[]).includes(raw ?? '') ? (raw as ThemeChoice) : null;
}

export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): Theme {
  if (choice === 'claro') return 'light';
  if (choice === 'escuro') return 'dark';
  return prefersDark ? 'dark' : 'light';
}

/** Padrão quando nada foi escolhido: quem já tem dados continua no escuro; instalação nova, Sistema. */
export function defaultChoice(storage: Pick<StorageLike, 'getItem'>): ThemeChoice {
  return DATA_KEYS.some((key) => storage.getItem(key) !== null) ? 'escuro' : 'sistema';
}

/**
 * A escolha salva; sem escolha (ou inválida), grava o padrão uma vez, para um usuário antigo não
 * mudar de tema depois (quando passar a ter dados novos ou limpar os antigos).
 */
export function readChoice(storage: StorageLike): ThemeChoice {
  const saved = parseChoice(storage.getItem(THEME_KEY));
  if (saved) return saved;
  const fallback = defaultChoice(storage);
  writeChoice(storage, fallback);
  return fallback;
}

export function writeChoice(storage: StorageLike, choice: ThemeChoice): void {
  try {
    storage.setItem(THEME_KEY, choice);
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
}

/** O oposto do tema na tela (atalho sol/lua): vira uma escolha manual. */
export function toggledChoice(current: Theme): ThemeChoice {
  return current === 'dark' ? 'claro' : 'escuro';
}
