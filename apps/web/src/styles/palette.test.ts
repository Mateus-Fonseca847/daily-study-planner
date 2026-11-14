import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PALETTE_COLORS } from '@daily/shared';
import {
  contrast,
  MIN_DELTA_E,
  MIN_DELTA_E_LIGHT,
  PALETTE,
  PALETTE_LIGHT,
  report,
  RESERVED,
  RESERVED_LIGHT,
} from '../../scripts/palette-check.mjs';

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

describe('paleta v5 (tokens.css × scripts/palette-check.mjs)', () => {
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

  it(`cores distintas: ΔE2000 ≥ ${MIN_DELTA_E} entre as cores da paleta`, () => {
    const close = report().pairs.filter((p) => p.dE < MIN_DELTA_E);
    expect(close).toEqual([]);
  });

  it('as 7 cores da v4 continuam com os mesmos valores (nada muda para quem já escolheu)', () => {
    expect(PALETTE_COLORS.slice(0, 7)).toEqual([
      'ciano',
      'petroleo',
      'gelo',
      'lilas',
      'fucsia',
      'rosa',
      'cinza',
    ]);
    expect(PALETTE).toMatchObject({
      ciano: '#2beeee',
      petroleo: '#53a9c6',
      gelo: '#c6dfec',
      lilas: '#e2c6ec',
      fucsia: '#de2bee',
      rosa: '#d279a6',
      cinza: '#a3998f',
    });
  });

  it('marca escura do hábito (ícone sobre a cor sólida) ≥ 4,5:1 em todas as cores', () => {
    for (const color of Object.values(PALETTE)) {
      expect(contrast(token('color-accent-fg'), color)).toBeGreaterThanOrEqual(4.5);
    }
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

/** Bloco do tema claro em `tokens.css` (`:root[data-theme='light'] { … }`). */
const lightBlock = /:root\[data-theme='light'\]\s*\{([\s\S]*?)\r?\n\}/.exec(tokens)![1]!;
const light = (name: string): string => {
  const match = new RegExp(`--ds-${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(lightBlock);
  if (!match) throw new Error(`token claro --ds-${name} não encontrado`);
  return match[1]!.toLowerCase();
};

describe('tema claro (tokens.css × palette-check)', () => {
  const L = {
    bg: light('color-bg'),
    surface: light('color-surface'),
    raised: light('color-surface-raised'),
    fg: light('color-fg'),
  };
  const CHIPS = {
    'status-pendente': ['color-status-pendente', 'color-status-pendente-soft'],
    'status-concluido': ['color-status-concluido', 'color-status-concluido-soft'],
    'status-cancelado': ['color-status-cancelado', 'color-status-cancelado-soft'],
    'tipo-prova': ['color-type-prova', 'color-type-prova-soft'],
    'tipo-especial': ['color-type-especial', 'color-type-especial-soft'],
  } as const;

  it('os tokens claros batem com o verificador; o amarelo da marca (preenchimento) não muda', () => {
    for (const key of PALETTE_COLORS) expect(light(`palette-${key}`)).toBe(PALETTE_LIGHT[key]);
    for (const [name, [ink]] of Object.entries(CHIPS))
      expect(light(ink)).toBe(RESERVED_LIGHT[name]);
    expect(light('color-streak')).toBe(RESERVED_LIGHT.chama);
    expect(light('color-accent-ink')).toBe(RESERVED_LIGHT.marca);
    expect(lightBlock).not.toMatch(/--ds-color-accent:/);
  });

  it(`cores distintas: ΔE2000 ≥ ${MIN_DELTA_E_LIGHT} entre as cores da paleta`, () => {
    expect(report('light').pairs.filter((p) => p.dE < MIN_DELTA_E_LIGHT)).toEqual([]);
  });

  it('texto principal e secundário ≥ 4,5:1 sobre fundo, superfície e superfície elevada', () => {
    for (const text of ['color-fg', 'color-fg-soft', 'color-fg-muted', 'color-fg-subtle']) {
      for (const base of [L.bg, L.surface, L.raised]) {
        expect(contrast(light(text), base)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('paleta, status, tipos, chama, perigo, tinta da marca e foco ≥ 4,5:1 sobre fundo e superfície', () => {
    const inks = [
      ...Object.values(PALETTE_LIGHT),
      ...Object.values(RESERVED_LIGHT),
      light('color-danger'),
      light('color-focus'),
    ];
    for (const ink of inks) {
      expect(contrast(ink, L.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, L.surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(Object.entries(CHIPS))(
    '%s: rótulo colorido, título e horário sobre o fundo suave do chip ≥ 4,5:1',
    (_name, [ink, soft]) => {
      const chip = light(soft);
      expect(contrast(light(ink), chip)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(L.fg, chip)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(light('color-fg-soft'), chip)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('marcas sobre preenchimentos: check branco no verde, pílula, texto no amarelo, tinta no amarelo suave', () => {
    expect(
      contrast(light('color-on-status'), light('color-status-concluido')),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(light('color-white-pill-fg'), light('color-white-pill')),
    ).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('color-accent-fg'), token('color-accent'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light('color-accent-ink'), light('color-accent-soft'))).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it('cor do hábito como texto (com a tinta) sobre o bloco do hábito; marca branca sobre a cor sólida', () => {
    const pct = (name: string) =>
      Number(new RegExp(`--ds-${name}:\\s*(\\d+)%`).exec(lightBlock)![1]) / 100;
    const ink = pct('habit-ink-mix');
    const block = pct('habit-block-mix');
    for (const color of Object.values(PALETTE_LIGHT)) {
      const text = over(L.fg, ink, color);
      expect(contrast(text, over(color, block, L.bg))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(light('color-on-habit'), color)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('texto escuro sobre a água (onda, preenchimento e fundo) ≥ 4,5:1', () => {
    for (const water of ['color-water', 'color-water-deep', 'color-water-wave']) {
      expect(contrast(L.fg, light(water))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('cancelado esmaecido (opacidade 60 %) ainda tem título ≥ 3:1', () => {
    const chip = light('color-status-cancelado-soft');
    expect(contrast(over(L.fg, 0.6, chip), chip)).toBeGreaterThanOrEqual(3);
  });
});

describe('níveis de medalha (bronze, prata, ouro) nos dois temas', () => {
  const pct = Number(/--ds-tier-soft-mix:\s*(\d+)%/.exec(tokens)![1]) / 100;
  const dark = (name: string) => token(name);
  const lightTier = light;
  it.each(['bronze', 'silver', 'gold'])(
    '%s: tinta ≥ 4,5:1 na superfície, no fundo e no disco',
    (tier) => {
      const surface = token('color-surface');
      const ink = dark(`tier-${tier}`);
      expect(contrast(ink, surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, BG)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, over(ink, pct, surface))).toBeGreaterThanOrEqual(4.5);

      const lInk = lightTier(`tier-${tier}`);
      const lSoft = lightTier(`tier-${tier}-soft`);
      for (const base of ['#ffffff', '#f4f4f6', lSoft]) {
        expect(contrast(lInk, base)).toBeGreaterThanOrEqual(4.5);
      }
    },
  );
});
