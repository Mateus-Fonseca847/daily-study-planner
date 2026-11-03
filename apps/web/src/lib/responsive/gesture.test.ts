import { describe, expect, it } from 'vitest';
import {
  exceedsLongPressMove,
  isHorizontalIntent,
  shouldCloseSheet,
  swipeDirection,
} from './gesture';

describe('swipeDirection', () => {
  it('deslize longo e horizontal troca o período (esquerda avança, direita volta)', () => {
    expect(swipeDirection({ dx: -120, dy: 10, dtMs: 300 })).toBe('left');
    expect(swipeDirection({ dx: 120, dy: -10, dtMs: 300 })).toBe('right');
  });

  it('deslize curto e lento não conta', () => {
    expect(swipeDirection({ dx: -40, dy: 0, dtMs: 400 })).toBeNull();
  });

  it('um flick rápido e curto conta', () => {
    expect(swipeDirection({ dx: -40, dy: 4, dtMs: 60 })).toBe('left');
  });

  it('um deslocamento muito pequeno nunca conta, nem rápido', () => {
    expect(swipeDirection({ dx: -12, dy: 0, dtMs: 10 })).toBeNull();
  });

  it('gesto mais vertical que horizontal é rolagem', () => {
    expect(swipeDirection({ dx: -80, dy: 70, dtMs: 200 })).toBeNull();
    expect(swipeDirection({ dx: -80, dy: 120, dtMs: 200 })).toBeNull();
  });

  it('exige que o horizontal domine (1,6×) o vertical', () => {
    expect(swipeDirection({ dx: -100, dy: 70, dtMs: 200 })).toBeNull();
    expect(swipeDirection({ dx: -100, dy: 50, dtMs: 200 })).toBe('left');
  });
});

describe('isHorizontalIntent', () => {
  it('só decide depois de passar da folga e com o horizontal dominando', () => {
    expect(isHorizontalIntent(6, 0)).toBe(false);
    expect(isHorizontalIntent(30, 4)).toBe(true);
    expect(isHorizontalIntent(30, 30)).toBe(false);
  });
});

describe('shouldCloseSheet', () => {
  it('fecha ao arrastar a alça longe o bastante para baixo', () => {
    expect(shouldCloseSheet({ dy: 140, dtMs: 800 })).toBe(true);
    expect(shouldCloseSheet({ dy: 60, dtMs: 800 })).toBe(false);
  });

  it('fecha com um arrasto rápido mesmo curto', () => {
    expect(shouldCloseSheet({ dy: 50, dtMs: 60 })).toBe(true);
  });

  it('arrastar para cima nunca fecha', () => {
    expect(shouldCloseSheet({ dy: -200, dtMs: 100 })).toBe(false);
  });
});

describe('toque longo', () => {
  it('cancela quando o dedo anda além da tolerância (era rolagem)', () => {
    expect(exceedsLongPressMove(3, 3)).toBe(false);
    expect(exceedsLongPressMove(0, 12)).toBe(true);
  });
});
