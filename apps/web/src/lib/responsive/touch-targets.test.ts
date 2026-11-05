import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MIN_INPUT_FONT_PX, TOUCH_DENSE_PX, TOUCH_MAIN_PX } from '../../../e2e/responsive/audit';

const tokens = readFileSync(new URL('../../styles/tokens.css', import.meta.url), 'utf8');
const px = (name: string): number => {
  const match = tokens.match(new RegExp(`--ds-${name}:\\s*([\\d.]+)rem`));
  expect(match, `--ds-${name}`).not.toBeNull();
  return Number(match![1]) * 16;
};

describe('regras de alvo de toque', () => {
  it('os tokens têm os tamanhos que os testes exigem (44 px, 24 px e 16 px)', () => {
    expect(px('touch')).toBe(TOUCH_MAIN_PX);
    expect(px('touch-dense')).toBe(TOUCH_DENSE_PX);
    expect(px('text-input-touch')).toBe(MIN_INPUT_FONT_PX);
  });

  it('o trilho do segmentado comporta itens de 44 px mais o respiro de 4 px de cada lado', () => {
    expect(px('segment-touch-h')).toBe(TOUCH_MAIN_PX + 2 * 4);
  });

  it('o heatmap compacto tem células de 13 px e vão de 3 px em telas de toque ou estreitas', () => {
    const block = tokens.match(
      /@media \(pointer: coarse\), \(width < 48rem\) \{[^}]*--ds-heat-cell-min:\s*([\d.]+)rem;\s*--ds-heat-cell-max:\s*([\d.]+)rem/,
    );
    expect(block, 'override do heatmap').not.toBeNull();
    expect(Number(block![1]) * 16).toBe(13);
    expect(Number(block![2]) * 16).toBe(13); // mínimo = máximo: a grade não estica
    expect(px('heat-gap')).toBe(3);
  });

  it('o texto de leitura do celular sobe para ≥ 16 px', () => {
    expect(px('text-readable')).toBeGreaterThanOrEqual(16);
  });
});
