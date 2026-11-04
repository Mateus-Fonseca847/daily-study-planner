import type { Page } from '@playwright/test';

/** Controles densos (heatmap, mini-mês…) levam `data-touch="dense"` e têm mínimo de 24 px. */
export const TOUCH_MAIN_PX = 44;
export const TOUCH_DENSE_PX = 24;
/** Fonte mínima dos campos de texto em celular (evita o zoom automático do iOS). */
export const MIN_INPUT_FONT_PX = 16;

export interface AuditResult {
  viewport: { width: number; height: number };
  /** O documento rola (largura ou altura maior que a janela). */
  documentOverflow: { x: number; y: number };
  /** Elementos visíveis fora da janela na horizontal (e fixos fora na vertical), fora de áreas `data-scroll-x`. */
  offscreen: string[];
  /** Áreas com rolagem horizontal não intencional (sem `data-scroll-x`) cujo conteúdo é mais largo que elas. */
  horizontalScrollers: string[];
  /** Controles principais com menos de 44 px. */
  smallTargets: string[];
  /** Controles densos com menos de 24 px. */
  tinyTargets: string[];
  /** Campos de texto com fonte menor que 16 px. */
  smallInputs: string[];
}

/**
 * Mede a página no navegador. Os seletores devolvidos são curtos e legíveis (tag, papel, rótulo)
 * para aparecerem nas mensagens de erro e no relatório da Fase 0.
 */
export async function auditPage(page: Page): Promise<AuditResult> {
  return page.evaluate(
    ({ main, dense, minFont }) => {
      const describe = (el: Element): string => {
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute('role');
        const label =
          el.getAttribute('aria-label') ??
          (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 28);
        return `${tag}${role ? `[${role}]` : ''} "${label}"`;
      };
      const isVisible = (el: Element): boolean => {
        const r = el.getBoundingClientRect();
        if (r.width <= 1 || r.height <= 1) return false;
        const style = getComputedStyle(el);
        return (
          style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) > 0
        );
      };
      const width = window.innerWidth;
      const height = window.innerHeight;
      const root = document.documentElement;
      const offscreen: string[] = [];
      const horizontalScrollers: string[] = [];
      const smallTargets: string[] = [];
      const tinyTargets: string[] = [];
      const smallInputs: string[] = [];

      const interactive =
        'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="checkbox"], [role="radio"], [role="tab"], [role="menuitem"], [role="switch"], [tabindex="0"]';

      for (const el of document.body.querySelectorAll('*')) {
        if (!isVisible(el)) continue;
        const r = el.getBoundingClientRect();
        const intentional =
          !!el.closest('[data-scroll-x]') || !!el.closest('.sr-only, [aria-hidden="true"]');
        const outsideX = r.right > width + 1 || r.left < -1;
        const outsideFixed =
          getComputedStyle(el).position === 'fixed' && (r.bottom > height + 1 || r.top < -1);
        if ((outsideX && !intentional) || outsideFixed) {
          // Só conta o elemento mais externo: os filhos de um elemento fora da tela se repetiriam.
          const pr = el.parentElement?.getBoundingClientRect();
          const parentOutside = pr !== undefined && (pr.right > width + 1 || pr.left < -1);
          if (!parentOutside || outsideFixed) offscreen.push(describe(el));
        }
        const overflowX = getComputedStyle(el).overflowX;
        if (
          (overflowX === 'auto' || overflowX === 'scroll') &&
          !el.hasAttribute('data-scroll-x') &&
          el.scrollWidth > el.clientWidth + 1
        ) {
          horizontalScrollers.push(`${describe(el)} ${el.scrollWidth}>${el.clientWidth}`);
        }
        if (
          el.matches(interactive) &&
          !el.closest('[inert], [aria-hidden="true"]') &&
          el.getAttribute('data-touch') !== 'inline' && // links no meio de uma frase (exceção do WCAG 2.5.8)
          el.getAttribute('data-touch') !== 'grid' // células do heatmap: grade compacta, com o sheet do dia como equivalente
        ) {
          const isDense =
            el.getAttribute('data-touch') === 'dense' || !!el.closest('[data-touch="dense"]');
          const limit = isDense ? dense : main;
          if (r.width < limit - 0.5 || r.height < limit - 0.5) {
            (isDense ? tinyTargets : smallTargets).push(
              `${describe(el)} ${Math.round(r.width)}×${Math.round(r.height)}`,
            );
          }
        }
        if (
          el.matches(
            'input:not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, select',
          )
        ) {
          const size = parseFloat(getComputedStyle(el).fontSize);
          if (size < minFont) smallInputs.push(`${describe(el)} ${size}px`);
        }
      }

      return {
        viewport: { width, height },
        documentOverflow: {
          x: Math.max(root.scrollWidth, document.body.scrollWidth) - width,
          y: Math.max(root.scrollHeight, document.body.scrollHeight) - height,
        },
        offscreen,
        horizontalScrollers,
        smallTargets,
        tinyTargets,
        smallInputs,
      };
    },
    { main: TOUCH_MAIN_PX, dense: TOUCH_DENSE_PX, minFont: MIN_INPUT_FONT_PX },
  );
}
