import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BREAKPOINT_PX, layoutFor, MEDIA, SHORT_HEIGHT_PX } from './breakpoints';
import { createMediaStore } from './media';

const css = readFileSync(new URL('../../styles/index.css', import.meta.url), 'utf8');
const remToPx = (rem: string) => Number(rem.replace('rem', '')) * 16;

describe('breakpoints espelhados no CSS', () => {
  const themeValue = (name: string) => {
    const match = css.match(new RegExp(`--breakpoint-${name}:\\s*([\\d.]+rem)`));
    expect(match, `--breakpoint-${name} em index.css`).not.toBeNull();
    return remToPx(match![1]!);
  };

  it('md, lg e xl do tema valem tablet, notebook e desktop', () => {
    expect(themeValue('md')).toBe(BREAKPOINT_PX.tablet);
    expect(themeValue('lg')).toBe(BREAKPOINT_PX.notebook);
    expect(themeValue('xl')).toBe(BREAKPOINT_PX.desktop);
  });

  it('as variantes phone, short e coarse usam as mesmas consultas de mídia', () => {
    const variant = (name: string) => {
      const match = css.match(new RegExp(`@custom-variant ${name} \\(@media ([^;]+)\\);`));
      expect(match, `@custom-variant ${name}`).not.toBeNull();
      return match![1]!;
    };
    expect(variant('phone')).toBe(MEDIA.phone);
    expect(variant('short')).toBe(MEDIA.short);
    expect(variant('coarse')).toBe(MEDIA.coarse);
  });

  it('a altura de paisagem de celular é a mesma no CSS e no TS', () => {
    expect(MEDIA.short).toContain(`${SHORT_HEIGHT_PX / 16}rem`);
  });
});

describe('layoutFor', () => {
  it('classifica pela largura', () => {
    expect(layoutFor(375, 667, true)).toBe('phone');
    expect(layoutFor(767, 1024, true)).toBe('phone');
    expect(layoutFor(768, 1024, true)).toBe('tablet');
    expect(layoutFor(1023, 768, false)).toBe('tablet');
    expect(layoutFor(1024, 768, false)).toBe('notebook');
    expect(layoutFor(1279, 720, false)).toBe('notebook');
    expect(layoutFor(1280, 720, false)).toBe('desktop');
    expect(layoutFor(1920, 1080, false)).toBe('desktop');
  });

  it('celular em paisagem (altura ≤ 500 com toque) é celular, mesmo com largura de tablet', () => {
    expect(layoutFor(844, 390, true)).toBe('phone');
    expect(layoutFor(1024, 500, true)).toBe('phone');
    expect(layoutFor(1024, 501, true)).toBe('notebook');
  });

  it('janela baixa de desktop com mouse continua desktop', () => {
    expect(layoutFor(1280, 500, false)).toBe('desktop');
    expect(layoutFor(1920, 480, false)).toBe('desktop');
  });
});

describe('createMediaStore', () => {
  const fake = (matches: boolean) => {
    const listeners = new Set<() => void>();
    const list = {
      matches,
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    } as unknown as MediaQueryList;
    return {
      list,
      listeners,
      set: (value: boolean) => ((list as { matches: boolean }).matches = value),
    };
  };

  it('lê o valor atual e avisa as mudanças', () => {
    const query = fake(false);
    const store = createMediaStore('(pointer: coarse)', () => query.list);
    expect(store.getSnapshot()).toBe(false);

    let calls = 0;
    const off = store.subscribe(() => (calls += 1));
    query.set(true);
    query.listeners.forEach((cb) => cb());
    expect(store.getSnapshot()).toBe(true);
    expect(calls).toBe(1);

    off();
    expect(query.listeners.size).toBe(0);
  });
});
