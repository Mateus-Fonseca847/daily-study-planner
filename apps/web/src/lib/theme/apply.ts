import { THEME_COLOR, type Theme, type ThemeChoice } from './theme';

/** Tempo em que a troca anima as cores (só com a classe `theme-switching`; ver `index.css`). */
export const SWITCH_MS = 200;

/**
 * Aplica o tema no documento: `data-theme` e `color-scheme` no `<html>` e a cor das barras do
 * sistema. Em “Sistema”, as duas metas `theme-color` seguem o `media` de cada uma; numa escolha
 * manual, as duas recebem a cor do tema escolhido.
 */
export function applyTheme(doc: Document, theme: Theme, choice: ThemeChoice): void {
  const root = doc.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  for (const meta of doc.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const own: Theme = meta.media.includes('dark') ? 'dark' : 'light';
    meta.content = THEME_COLOR[choice === 'sistema' ? own : theme];
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** Troca com transição curta de cores (a classe sai depois; `prefers-reduced-motion` desliga no CSS). */
export function switchTheme(doc: Document, theme: Theme, choice: ThemeChoice): void {
  const root = doc.documentElement;
  if (root.dataset.theme !== theme) {
    root.classList.add('theme-switching');
    clearTimeout(timer);
    timer = setTimeout(() => root.classList.remove('theme-switching'), SWITCH_MS);
  }
  applyTheme(doc, theme, choice);
}
