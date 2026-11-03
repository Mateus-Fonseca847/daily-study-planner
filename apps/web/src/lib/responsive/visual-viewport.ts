/**
 * Teclado virtual. O `interactive-widget=resizes-content` (meta viewport) faz o Chrome do Android
 * encolher a área de layout; o iOS não suporta isso e só encolhe a "visual viewport". Por isso o app
 * também publica a área visível em `--ds-vv-h` e `--ds-vv-top`, e os sheets e modais de tela cheia
 * se ajustam a elas: o campo focado e as ações ficam acima do teclado nos dois sistemas.
 */

export interface ViewportBox {
  height: number;
  top: number;
}

interface ViewportSample {
  innerHeight: number;
  vvHeight: number;
  vvOffsetTop: number;
  /** Zoom de pinça (1 = sem zoom). */
  scale: number;
}

/** Com zoom de pinça a visual viewport também encolhe; só o teclado deve mexer na altura. */
export function visibleBox({
  innerHeight,
  vvHeight,
  vvOffsetTop,
  scale,
}: ViewportSample): ViewportBox {
  if (Math.abs(scale - 1) > 0.01) return { height: innerHeight, top: 0 };
  return {
    height: Math.min(innerHeight, Math.round(vvHeight)),
    top: Math.max(0, Math.round(vvOffsetTop)),
  };
}

/** Liga a atualização das variáveis CSS (uma vez, no início do app). */
export function installVisualViewport(): void {
  const vv = window.visualViewport;
  if (!vv) return;
  const root = document.documentElement;
  const update = () => {
    const box = visibleBox({
      innerHeight: window.innerHeight,
      vvHeight: vv.height,
      vvOffsetTop: vv.offsetTop,
      scale: vv.scale,
    });
    if (box.height === window.innerHeight && box.top === 0) {
      root.style.removeProperty('--ds-vv-h');
      root.style.removeProperty('--ds-vv-top');
      return;
    }
    root.style.setProperty('--ds-vv-h', `${box.height}px`);
    root.style.setProperty('--ds-vv-top', `${box.top}px`);
  };
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  update();
}
