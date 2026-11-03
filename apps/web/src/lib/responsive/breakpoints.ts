/**
 * Breakpoints do app, definidos em um só lugar. O Tailwind os recebe em `styles/index.css`
 * (`--breakpoint-*` e as variantes `phone`, `coarse` e `short`); `breakpoints.test.ts` garante que
 * o CSS e estas constantes coincidem.
 *
 *   celular   < 768 px (ou paisagem de celular: altura ≤ 500 px com toque)
 *   tablet    768–1023 px
 *   notebook  1024–1279 px
 *   desktop   ≥ 1280 px (comportamento original)
 */

/** Largura mínima (px) de cada faixa. */
export const BREAKPOINT_PX = {
  tablet: 768,
  notebook: 1024,
  desktop: 1280,
} as const;

/** Altura máxima (px) de um celular em paisagem. */
export const SHORT_HEIGHT_PX = 500;

export type Layout = 'phone' | 'tablet' | 'notebook' | 'desktop';

const PX_PER_REM = 16;
const rem = (px: number): string => `${px / PX_PER_REM}rem`;

/** Consultas de mídia (as mesmas das variantes do Tailwind). */
export const MEDIA = {
  /** Celular: faixa estreita ou paisagem baixa com toque. */
  phone: `(width < ${rem(BREAKPOINT_PX.tablet)}), (height <= ${rem(SHORT_HEIGHT_PX)}) and (pointer: coarse)`,
  /** Paisagem baixa com toque (barras mais finas). */
  short: `(height <= ${rem(SHORT_HEIGHT_PX)}) and (pointer: coarse)`,
  /** Ponteiro grosseiro e sem hover: dedo. */
  coarse: '(pointer: coarse)',
  /** Sem hover: nada pode depender dele. */
  noHover: '(hover: none)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
} as const;

/** Faixa de layout para uma janela (função pura; os hooks usam `matchMedia`). */
export function layoutFor(width: number, height: number, coarse: boolean): Layout {
  if (width < BREAKPOINT_PX.tablet || (height <= SHORT_HEIGHT_PX && coarse)) return 'phone';
  if (width < BREAKPOINT_PX.notebook) return 'tablet';
  if (width < BREAKPOINT_PX.desktop) return 'notebook';
  return 'desktop';
}
