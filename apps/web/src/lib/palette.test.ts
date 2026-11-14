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
  PALETTE_GROUPS,
  PALETTE_NAME,
  paletteName,
  PICKER_ORDER,
} from './palette';
import { nextPickerIndex } from './palette-nav';

describe('catálogo de cores', () => {
  it('27 cores, ids únicos e no formato; as 7 da v4 primeiro e inalteradas', () => {
    expect(PALETTE_COLORS).toHaveLength(27);
    expect(new Set(PALETTE_COLORS).size).toBe(PALETTE_COLORS.length);
    for (const id of PALETTE_COLORS) expect(id).toMatch(/^[a-z][a-z-]{0,31}$/);
    expect(PALETTE_COLORS.slice(0, 7)).toEqual([...PALETTE_V4]);
    expect(PALETTE_V4).toEqual(['ciano', 'petroleo', 'gelo', 'lilas', 'fucsia', 'rosa', 'cinza']);
  });

  it('todo id tem nome em pt-BR e classe literal; os grupos cobrem cada cor uma vez', () => {
    for (const id of PALETTE_COLORS) {
      expect(PALETTE_NAME[id].length).toBeGreaterThan(0);
      expect(habitColorClass(id)).toBe(`habit-${id}`);
    }
    expect([...PICKER_ORDER].sort()).toEqual([...PALETTE_COLORS].sort());
    expect(PALETTE_GROUPS.map((g) => g.name)).toEqual([
      'Vermelhos',
      'Laranjas e terrosos',
      'Amarelos',
      'Verdes',
      'Azul-esverdeados',
      'Azuis',
      'Roxos',
      'Rosas',
      'Neutros',
    ]);
    expect(PALETTE_NAME.petroleo).toBe('Azul-petróleo');
  });
});

describe('resolução de cor', () => {
  it('conhecida fica igual; desconhecida usa a cor segura, sem erro', () => {
    expect(resolvePaletteColor('verde')).toBe('verde');
    expect(resolvePaletteColor('ciano')).toBe('ciano');
    expect(resolvePaletteColor('ultravioleta')).toBe(FALLBACK_PALETTE_COLOR);
    expect(habitColorClass('ultravioleta')).toBe('habit-cinza');
    expect(paletteName('ultravioleta')).toBe('Cinza');
  });

  it('o esquema aceita cores novas e desconhecidas bem formadas e guarda o valor original', () => {
    const subject = { id: 's', name: 'Química', color: 'ultravioleta' };
    expect(subjectSchema.parse(subject).color).toBe('ultravioleta');
    expect(subjectSchema.safeParse({ ...subject, color: 'Azul!' }).success).toBe(false);
    expect(subjectSchema.safeParse({ ...subject, color: '' }).success).toBe(false);
    expect(habitSchema.shape.color.parse('terracota')).toBe('terracota');
  });
});

describe('importar e exportar', () => {
  it('cores novas e desconhecidas passam pelo backup sem mudar', () => {
    const snap = {
      ...createDataStore(memoryRepo().repo).getState().snapshot(),
      subjects: [
        { id: 'a', name: 'Química', color: 'terracota' },
        { id: 'b', name: 'Física', color: 'cor-do-futuro' },
        { id: 'c', name: 'História', color: 'ciano' },
      ],
    };
    const now = new Date('2026-11-14T10:00:00');
    const result = parseEnvelope(serializeEnvelope(snap, now), now);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.subjects.map((s) => s.color)).toEqual([
        'terracota',
        'cor-do-futuro',
        'ciano',
      ]);
    }
  });

  it('a migração v3 → v4 continua remapeando só para a paleta da v4 (resultado igual ao de antes)', () => {
    const items = remapColors([{ color: 'vermelho' }, { color: 'verde' }, { color: 'laranja' }]);
    expect(items.map((i) => i.color)).toEqual(['fucsia', 'gelo', 'cinza']);
  });
});

describe('teclado do seletor', () => {
  const at = (id: string) => PICKER_ORDER.indexOf(id as never);

  it('← → andam uma cor sem dar a volta; Home e End vão às pontas', () => {
    expect(nextPickerIndex(0, 'ArrowLeft')).toBe(0);
    expect(nextPickerIndex(0, 'ArrowRight')).toBe(1);
    expect(nextPickerIndex(5, 'Home')).toBe(0);
    expect(nextPickerIndex(0, 'End')).toBe(PICKER_ORDER.length - 1);
    expect(nextPickerIndex(PICKER_ORDER.length - 1, 'ArrowRight')).toBe(PICKER_ORDER.length - 1);
  });

  it('↑ ↓ trocam de grupo na mesma posição (ou na última do grupo menor)', () => {
    expect(nextPickerIndex(at('vermelho'), 'ArrowDown')).toBe(at('laranja'));
    expect(nextPickerIndex(at('marrom'), 'ArrowDown')).toBe(at('mostarda'));
    expect(nextPickerIndex(at('mostarda'), 'ArrowUp')).toBe(at('coral'));
    expect(nextPickerIndex(at('vermelho'), 'ArrowUp')).toBe(at('vermelho'));
    expect(nextPickerIndex(at('grafite'), 'ArrowDown')).toBe(at('grafite'));
  });

  it('outras teclas não navegam (Enter e Espaço ficam com o botão)', () => {
    expect(nextPickerIndex(0, 'Enter')).toBeNull();
    expect(nextPickerIndex(0, ' ')).toBeNull();
    expect(nextPickerIndex(0, 'Tab')).toBeNull();
  });
});
