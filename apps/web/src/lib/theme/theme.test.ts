import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '../data/local-storage-repository';
import { applyTheme } from './apply';
import {
  defaultChoice,
  parseChoice,
  readChoice,
  resolveTheme,
  THEME_COLOR,
  THEME_KEY,
  toggledChoice,
  writeChoice,
  type ThemeChoice,
} from './theme';

/** Documento mínimo: o `<html>` e as duas metas `theme-color` do `index.html`. */
function fakeDocument() {
  const attrs: Record<string, string> = {};
  const metas = [
    { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#131313' },
    { name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#f4f4f6' },
  ];
  const root = {
    dataset: {} as Record<string, string>,
    style: {} as Record<string, string>,
    setAttribute(key: string, value: string) {
      attrs[key] = value;
      if (key === 'data-theme') root.dataset.theme = value;
    },
  };
  const doc = { documentElement: root, querySelectorAll: () => metas };
  return { doc, root, metas, colors: () => metas.map((m) => m.content) };
}

describe('resolução do tema', () => {
  it('Claro e Escuro valem sempre; Sistema segue o aparelho', () => {
    expect(resolveTheme('claro', true)).toBe('light');
    expect(resolveTheme('escuro', false)).toBe('dark');
    expect(resolveTheme('sistema', true)).toBe('dark');
    expect(resolveTheme('sistema', false)).toBe('light');
  });

  it('valor inválido não é escolha', () => {
    expect(parseChoice('claro')).toBe('claro');
    expect(parseChoice('light')).toBeNull();
    expect(parseChoice('')).toBeNull();
    expect(parseChoice(null)).toBeNull();
  });

  it('o atalho leva ao oposto do que está na tela (escolha manual)', () => {
    expect(toggledChoice('dark')).toBe('claro');
    expect(toggledChoice('light')).toBe('escuro');
  });
});

describe('escolha salva e padrões', () => {
  it('instalação nova começa em Sistema; quem já tem dados (qualquer formato) fica no Escuro', () => {
    expect(defaultChoice(new MemoryStorage())).toBe('sistema');
    for (const key of ['daily:v5', 'daily:v4', 'daily:v1']) {
      const storage = new MemoryStorage();
      storage.setItem(key, '{}');
      expect(defaultChoice(storage)).toBe('escuro');
    }
  });

  it('sem escolha, grava o padrão uma vez (o usuário antigo não muda de tema depois)', () => {
    const storage = new MemoryStorage();
    storage.setItem('daily:v5', '{}');
    expect(readChoice(storage)).toBe('escuro');
    expect(storage.getItem(THEME_KEY)).toBe('escuro');
    storage.removeItem('daily:v5');
    expect(readChoice(storage)).toBe('escuro');
  });

  it('lê e grava a escolha; um valor inválido salvo volta ao padrão', () => {
    const storage = new MemoryStorage();
    writeChoice(storage, 'claro');
    expect(readChoice(storage)).toBe('claro');
    storage.setItem(THEME_KEY, 'roxo');
    expect(readChoice(storage)).toBe('sistema');
  });

  it('armazenamento que falha não quebra a gravação', () => {
    const broken = new MemoryStorage();
    broken.setItem = () => {
      throw new Error('cheio');
    };
    expect(() => writeChoice(broken, 'claro')).not.toThrow();
  });
});

describe('aplicar no documento (theme-color)', () => {
  it('em Sistema, cada meta fica com a cor do próprio media', () => {
    const { doc, root, colors } = fakeDocument();
    applyTheme(doc as unknown as Document, 'light', 'sistema');
    expect(root.dataset.theme).toBe('light');
    expect(root.style.colorScheme).toBe('light');
    expect(colors()).toEqual([THEME_COLOR.dark, THEME_COLOR.light]);
  });

  it('numa escolha manual, as duas metas recebem a cor do tema escolhido', () => {
    const { doc, colors } = fakeDocument();
    applyTheme(doc as unknown as Document, 'light', 'claro');
    expect(colors()).toEqual([THEME_COLOR.light, THEME_COLOR.light]);
    applyTheme(doc as unknown as Document, 'dark', 'escuro');
    expect(colors()).toEqual([THEME_COLOR.dark, THEME_COLOR.dark]);
  });
});

describe('public/theme-init.js (antes da 1ª pintura) concorda com o módulo', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../../../public/theme-init.js', import.meta.url)),
    'utf8',
  );
  const run = (storage: MemoryStorage, prefersDark: boolean) => {
    const fake = fakeDocument();
    runInNewContext(source, {
      localStorage: storage,
      window: { matchMedia: () => ({ matches: prefersDark }) },
      document: fake.doc,
    });
    return fake;
  };

  it.each([
    [null, false, false],
    [null, true, false],
    [null, false, true],
    ['claro', true, true],
    ['escuro', false, false],
    ['sistema', true, true],
    ['invalido', false, false],
  ] as const)('salvo=%s, aparelho escuro=%s, tem dados=%s', (saved, prefersDark, hasData) => {
    const storage = new MemoryStorage();
    if (saved) storage.setItem(THEME_KEY, saved);
    if (hasData) storage.setItem('daily:v5', '{}');
    const expectedChoice: ThemeChoice = parseChoice(saved) ?? defaultChoice(storage);
    const expected = resolveTheme(expectedChoice, prefersDark);

    const { root, colors } = run(storage, prefersDark);
    expect(root.dataset.theme).toBe(expected);
    expect(root.style.colorScheme).toBe(expected);
    expect(storage.getItem(THEME_KEY)).toBe(saved && parseChoice(saved) ? saved : expectedChoice);
    expect(colors()).toEqual(
      expectedChoice === 'sistema'
        ? [THEME_COLOR.dark, THEME_COLOR.light]
        : [THEME_COLOR[expected], THEME_COLOR[expected]],
    );
  });

  it('THEME_COLOR é o --ds-color-bg de cada tema em tokens.css', () => {
    const tokens = readFileSync(
      fileURLToPath(new URL('../../styles/tokens.css', import.meta.url)),
      'utf8',
    );
    const bgs = [...tokens.matchAll(/--ds-color-bg:\s*(#[0-9a-f]{6})/gi)].map((m) => m[1]);
    expect(bgs).toEqual([THEME_COLOR.dark, THEME_COLOR.light]);
  });

  it('as cores e as chaves do script são as do módulo', () => {
    expect(source).toContain(`'${THEME_KEY}'`);
    expect(source).toContain(THEME_COLOR.dark);
    expect(source).toContain(THEME_COLOR.light);
  });

  it('sem armazenamento (modo privado) e sem matchMedia, abre no escuro', () => {
    const fake = fakeDocument();
    runInNewContext(source, {
      get localStorage(): never {
        throw new Error('bloqueado');
      },
      window: {},
      document: fake.doc,
    });
    expect(fake.root.dataset.theme).toBe('dark');
  });
});
