import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PALETTE_COLORS } from '@daily/shared';
import { contrast, MIN_DELTA_E, PALETTE, report, RESERVED } from '../../scripts/palette-check.mjs';

const tokens = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8');
const token = (name: string): string => {
  const match = new RegExp(`--ds-${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(tokens);
  if (!match) throw new Error(`token --ds-${name} não encontrado`);
  return match[1]!.toLowerCase();
};
const BG = token('color-bg');
const SURFACE_TOKEN = token('color-surface');
const ALPHA = Number(/--ds-event-chip-alpha:\s*(\d+)%/.exec(tokens)![1]) / 100;

/** `color-mix(in srgb, cor X%, transparent)` pintado sobre o fundo. */
function over(hex: string, alpha: number, base: string): string {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2]
    .map((i) => Math.round(ch(hex, i) * alpha + ch(base, i) * (1 - alpha)))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

const STATUS_AND_TYPES = {
  'status-pendente': token('color-status-pendente'),
  'status-concluido': token('color-status-concluido'),
  'status-cancelado': token('color-status-cancelado'),
  'type-prova': token('color-type-prova'),
  'type-especial': token('color-type-especial'),
};

describe('paleta v4 (tokens.css × scripts/palette-check.mjs)', () => {
  it('os tokens da paleta e das cores reservadas batem com o verificador', () => {
    for (const key of PALETTE_COLORS) expect(token(`palette-${key}`)).toBe(PALETTE[key]);
    expect(STATUS_AND_TYPES['status-pendente']).toBe(RESERVED['status-pendente']);
    expect(STATUS_AND_TYPES['status-concluido']).toBe(RESERVED['status-concluido']);
    expect(STATUS_AND_TYPES['status-cancelado']).toBe(RESERVED['status-cancelado']);
    expect(STATUS_AND_TYPES['type-prova']).toBe(RESERVED['tipo-prova']);
    expect(STATUS_AND_TYPES['type-especial']).toBe(RESERVED['tipo-especial']);
    expect(token('color-streak')).toBe(RESERVED.chama);
    expect(token('color-accent')).toBe(RESERVED.marca);
  });

  it(`cores distintas: ΔE2000 ≥ ${MIN_DELTA_E} entre a paleta e contra status, tipos e marca`, () => {
    const close = report().pairs.filter((p) => p.dE < MIN_DELTA_E);
    expect(close).toEqual([]);
  });

  it('a paleta não tem vermelho, verde, amarelo nem laranja', () => {
    expect(PALETTE_COLORS).not.toContain('vermelho');
    expect(PALETTE_COLORS).not.toContain('verde');
    expect(PALETTE_COLORS).not.toContain('amarelo');
    expect(PALETTE_COLORS).not.toContain('laranja');
  });
});

describe('contraste AA dos chips e estados novos', () => {
  it.each(Object.entries(STATUS_AND_TYPES))(
    '%s: rótulo colorido sobre o chip e título branco ≥ 4,5:1',
    (_name, color) => {
      for (const base of [BG, SURFACE_TOKEN]) {
        const chip = over(color, ALPHA, base);
        expect(contrast(color, chip)).toBeGreaterThanOrEqual(4.5);
        expect(contrast('#ffffff', chip)).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it('paleta, chama e status como texto sobre o fundo e a superfície ≥ 4,5:1', () => {
    const colors = [
      ...Object.values(PALETTE),
      ...Object.values(STATUS_AND_TYPES),
      token('color-streak'),
    ];
    for (const color of colors) {
      expect(contrast(color, BG)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(color, SURFACE_TOKEN)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('check verde do “concluído” (ícone escuro sobre verde) ≥ 4,5:1', () => {
    expect(
      contrast(token('color-accent-fg'), STATUS_AND_TYPES['status-concluido']),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('cancelado esmaecido (opacidade 60 %) ainda tem título ≥ 3:1 (texto grande/negrito do chip)', () => {
    const chip = over(STATUS_AND_TYPES['status-cancelado'], ALPHA, BG);
    expect(contrast(over('#ffffff', 0.6, chip), chip)).toBeGreaterThanOrEqual(3);
  });
});
