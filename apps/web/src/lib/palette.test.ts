import { describe, expect, it } from 'vitest';
import {
  FALLBACK_PALETTE_COLOR,
  habitSchema,
  PALETTE_COLORS,
  PALETTE_V4,
  resolvePaletteColor,
  subjectSchema,
} from '@daily/shared';
import { parseEnvelope, remapColors, serializeEnvelope } from './data/envelope';
import { createDataStore } from './data/store';
import { memoryRepo } from './data/test-utils';
import {
  habitColorClass,
  PALETTE_NAME,
  paletteName,
  PICKER_COLORS,
  PICKER_COLUMNS,
} from './palette';
import { nextPickerIndex } from './palette-nav';

describe('catálogo de cores', () => {
  it('ids únicos e no formato; as 7 da v4 primeiro e inalteradas', () => {
    expect(new Set(PALETTE_COLORS).size).toBe(PALETTE_COLORS.length);
    for (const id of PALETTE_COLORS) expect(id).toMatch(/^[a-z][a-z-]{0,31}$/);
    expect(PALETTE_COLORS.slice(0, 7)).toEqual([...PALETTE_V4]);
    expect(PALETTE_V4).toEqual(['ciano', 'petroleo', 'gelo', 'lilas', 'fucsia', 'rosa', 'cinza']);
  });

  it('o seletor oferece 8 cores em 2 linhas × 4 colunas, por matiz', () => {
    expect(PICKER_COLORS).toEqual([
      'vermelho',
      'laranja',
      'amarelo',
      'lima',
      'verde',
      'ciano',
      'azul',
      'fucsia',
    ]);
    expect(PICKER_COLUMNS).toBe(4);
    expect(PICKER_COLORS.length / PICKER_COLUMNS).toBe(2);
  });

  it('toda cor conhecida tem nome em pt-BR e classe literal', () => {
    for (const id of PALETTE_COLORS) {
      expect(PALETTE_NAME[id].length).toBeGreaterThan(0);
      expect(habitColorClass(id)).toBe(`habit-${id}`);
    }
  });
});

describe('resolução de cor', () => {
  it('conhecida fica igual (inclusive as da v4 fora do seletor); desconhecida usa a cor segura', () => {
    expect(resolvePaletteColor('verde')).toBe('verde');
    expect(resolvePaletteColor('petroleo')).toBe('petroleo');
    expect(resolvePaletteColor('ultravioleta')).toBe(FALLBACK_PALETTE_COLOR);
    expect(habitColorClass('ultravioleta')).toBe('habit-cinza');
    expect(paletteName('ultravioleta')).toBe('Cinza');
  });

  it('o esquema aceita cores novas e desconhecidas bem formadas e guarda o valor original', () => {
    const subject = { id: 's', name: 'Química', color: 'ultravioleta' };
    expect(subjectSchema.parse(subject).color).toBe('ultravioleta');
    expect(subjectSchema.safeParse({ ...subject, color: 'Azul!' }).success).toBe(false);
    expect(subjectSchema.safeParse({ ...subject, color: '' }).success).toBe(false);
    expect(habitSchema.shape.color.parse('laranja')).toBe('laranja');
  });
});

describe('importar e exportar', () => {
  it('cores novas, antigas e desconhecidas passam pelo backup sem mudar', () => {
    const snap = {
      ...createDataStore(memoryRepo().repo).getState().snapshot(),
      subjects: [
        { id: 'a', name: 'Química', color: 'laranja' },
        { id: 'b', name: 'Física', color: 'cor-do-futuro' },
        { id: 'c', name: 'História', color: 'lilas' },
      ],
    };
    const now = new Date('2026-11-14T10:00:00');
    const result = parseEnvelope(serializeEnvelope(snap, now), now);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.subjects.map((s) => s.color)).toEqual([
        'laranja',
        'cor-do-futuro',
        'lilas',
      ]);
    }
  });

  it('a migração v3 → v4 continua remapeando só para a paleta da v4 (resultado igual ao de antes)', () => {
    const items = remapColors([{ color: 'vermelho' }, { color: 'verde' }, { color: 'laranja' }]);
    expect(items.map((i) => i.color)).toEqual(['fucsia', 'gelo', 'cinza']);
  });
});

describe('teclado do seletor (grade 2 × 4)', () => {
  const at = (id: string) => PICKER_COLORS.indexOf(id as never);

  it('← → andam uma cor sem dar a volta; Home e End vão às pontas', () => {
    expect(nextPickerIndex(0, 'ArrowLeft')).toBe(0);
    expect(nextPickerIndex(0, 'ArrowRight')).toBe(1);
    expect(nextPickerIndex(at('lima'), 'ArrowRight')).toBe(at('verde'));
    expect(nextPickerIndex(5, 'Home')).toBe(0);
    expect(nextPickerIndex(0, 'End')).toBe(7);
    expect(nextPickerIndex(7, 'ArrowRight')).toBe(7);
  });

  it('↑ ↓ andam uma linha na mesma coluna e param nas bordas', () => {
    expect(nextPickerIndex(at('vermelho'), 'ArrowDown')).toBe(at('verde'));
    expect(nextPickerIndex(at('amarelo'), 'ArrowDown')).toBe(at('azul'));
    expect(nextPickerIndex(at('fucsia'), 'ArrowUp')).toBe(at('lima'));
    expect(nextPickerIndex(at('vermelho'), 'ArrowUp')).toBe(at('vermelho'));
    expect(nextPickerIndex(at('fucsia'), 'ArrowDown')).toBe(at('fucsia'));
  });

  it('outras teclas não navegam (Enter e Espaço ficam com o botão)', () => {
    expect(nextPickerIndex(0, 'Enter')).toBeNull();
    expect(nextPickerIndex(0, ' ')).toBeNull();
    expect(nextPickerIndex(0, 'Tab')).toBeNull();
  });
});
