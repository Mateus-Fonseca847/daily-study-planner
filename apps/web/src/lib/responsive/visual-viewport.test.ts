import { describe, expect, it } from 'vitest';
import { visibleBox } from './visual-viewport';

describe('visibleBox', () => {
  it('sem teclado, a área visível é a janela', () => {
    expect(visibleBox({ innerHeight: 844, vvHeight: 844, vvOffsetTop: 0, scale: 1 })).toEqual({
      height: 844,
      top: 0,
    });
  });

  it('com o teclado aberto, a altura encolhe e o topo acompanha a rolagem', () => {
    expect(visibleBox({ innerHeight: 844, vvHeight: 520.4, vvOffsetTop: 12.6, scale: 1 })).toEqual({
      height: 520,
      top: 13,
    });
  });

  it('zoom de pinça não é teclado', () => {
    expect(visibleBox({ innerHeight: 844, vvHeight: 400, vvOffsetTop: 90, scale: 2 })).toEqual({
      height: 844,
      top: 0,
    });
  });

  it('nunca passa da altura da janela', () => {
    expect(visibleBox({ innerHeight: 700, vvHeight: 900, vvOffsetTop: -4, scale: 1 })).toEqual({
      height: 700,
      top: 0,
    });
  });
});
