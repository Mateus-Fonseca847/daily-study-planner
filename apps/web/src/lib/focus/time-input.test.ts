import { describe, expect, it } from 'vitest';
import { preferencesSchema } from '@daily/shared';
import {
  clampSeconds,
  durationNotice,
  formatDuration,
  parseDuration,
  sanitizeDurationText,
  stepDuration,
} from './time-input';
import { createIdleSession } from './session';
import { createDataStore } from '../data/store';
import {
  LocalStorageRepository,
  MemoryStorage,
  STORAGE_KEY,
} from '../data/local-storage-repository';
import { makeSnapshot, memoryRepo } from '../data/test-utils';

const ok = (seconds: number, clamped: 'min' | 'max' | null = null) => ({
  ok: true,
  seconds,
  clamped,
});

describe('parseDuration — formatos aceitos', () => {
  it.each([
    ['25', ok(25 * 60)],
    ['1', ok(60)],
    ['90', ok(90 * 60)], // 90 = 1 h 30
    ['180', ok(180 * 60)], // limite máximo exato
    ['25:30', ok(25 * 60 + 30)],
    ['0:90', { ok: false }], // segundos acima de 59
    ['1:30:00', ok(90 * 60)],
    ['3:00:00', ok(180 * 60)],
    ['0:01:30', ok(90)],
    ['  25  ', ok(25 * 60)], // espaços ao redor
    ['025', ok(25 * 60)], // zeros à esquerda
  ])('%s', (text, expected) => {
    expect(parseDuration(text)).toEqual(expected);
  });
});

describe('parseDuration — limites e entradas inválidas', () => {
  it('abaixo de 1 min é ajustado para 1 min (com aviso)', () => {
    expect(parseDuration('0')).toEqual(ok(60, 'min'));
    expect(parseDuration('0:30')).toEqual(ok(60, 'min'));
    expect(parseDuration('0:59')).toEqual(ok(60, 'min'));
    expect(parseDuration('0:60')).toEqual({ ok: false });
    expect(parseDuration('1:00')).toEqual(ok(60)); // exatamente o mínimo
  });

  it('acima de 3 h é ajustado para 3 h (com aviso)', () => {
    expect(parseDuration('181')).toEqual(ok(180 * 60, 'max'));
    expect(parseDuration('3:00:01')).toEqual(ok(180 * 60, 'max'));
    expect(parseDuration('99:59:59')).toEqual(ok(180 * 60, 'max'));
  });

  it.each([
    '',
    '   ',
    ':',
    '::',
    '1::2',
    ':30',
    '25:',
    '1:2:3:4',
    'abc',
    '2 5',
    '-5',
    '2.5',
    '1,5',
    '25:7a',
    '1:60:00',
    '1:00:60',
    '9999999',
  ])('recusa %j', (text) => {
    expect(parseDuration(text)).toEqual({ ok: false });
  });

  it('mensagens para o aria-live', () => {
    expect(durationNotice(parseDuration('abc'), 1500)).toBe('Duração inválida. Mantido 25:00.');
    expect(durationNotice(parseDuration('0'), 1500)).toBe('Duração mínima: 1 minuto.');
    expect(durationNotice(parseDuration('999'), 1500)).toBe('Duração máxima: 3 horas.');
    expect(durationNotice(parseDuration('25'), 1500)).toBeNull();
  });
});

describe('formatação, limites e passos', () => {
  it('formata como mm:ss ou h:mm:ss, preservando segundos', () => {
    expect(formatDuration(1500)).toBe('25:00');
    expect(formatDuration(25 * 60 + 30)).toBe('25:30');
    expect(formatDuration(90 * 60)).toBe('1:30:00');
    expect(formatDuration(180 * 60)).toBe('3:00:00');
    expect(formatDuration(60)).toBe('01:00');
  });

  it('formatar e interpretar são inversos', () => {
    for (const seconds of [60, 61, 599, 1500, 1530, 3599, 3600, 5400, 10799, 10800]) {
      expect(parseDuration(formatDuration(seconds))).toEqual(ok(seconds));
    }
  });

  it('só dígitos e “:” entram no campo', () => {
    expect(sanitizeDurationText('2a5:3x0 ,.-')).toBe('25:30');
    expect(sanitizeDurationText('abc')).toBe('');
  });

  it('clampSeconds limita a 1 min – 3 h', () => {
    expect(clampSeconds(0)).toBe(60);
    expect(clampSeconds(59.4)).toBe(60);
    expect(clampSeconds(99999)).toBe(10800);
    expect(clampSeconds(1500.4)).toBe(1500);
  });

  it('↑/↓ = ±1 min; Shift = ±5 min; nunca sai dos limites e preserva segundos', () => {
    expect(stepDuration(1500, 1, false)).toBe(1560);
    expect(stepDuration(1500, -1, false)).toBe(1440);
    expect(stepDuration(1500, 1, true)).toBe(1800);
    expect(stepDuration(1500, -1, true)).toBe(1200);
    expect(stepDuration(90, -1, false)).toBe(60);
    expect(stepDuration(60, -1, true)).toBe(60);
    expect(stepDuration(10800, 1, true)).toBe(10800);
    expect(stepDuration(1530, 1, false)).toBe(1590); // 25:30 → 26:30
  });

  it('a sessão aceita segundos (não só minutos)', () => {
    const s = createIdleSession({ id: 'a', seconds: 25 * 60 + 30, tabId: 't' });
    expect(s.durationSec).toBe(1530);
    expect(createIdleSession({ id: 'a', seconds: 5, tabId: 't' }).durationSec).toBe(60);
  });
});

describe('última duração como padrão (preferência em segundos)', () => {
  it('persiste a duração confirmada, com segundos, e sobrevive a reabrir', () => {
    const { repo, storage } = memoryRepo();
    const store = createDataStore(repo);
    store.getState().updatePreferences({ focusDurationSec: 25 * 60 + 30 });
    expect(store.getState().preferences.focusDurationSec).toBe(1530);

    const reopened = createDataStore(new LocalStorageRepository(storage));
    expect(reopened.getState().preferences.focusDurationSec).toBe(1530);
  });

  it('o padrão inicial é 25 min', () => {
    expect(memoryRepo().repo.preferences.get().focusDurationSec).toBe(1500);
  });

  it('formato antigo (minutos) é aceito e convertido para segundos, sem migração de versão', () => {
    const legacy = preferencesSchema.parse({
      name: 'Ana',
      focusDurationMin: 45,
      lockByDefault: true,
    });
    expect(legacy).toMatchObject({ name: 'Ana', focusDurationSec: 2700, lockByDefault: true });
    expect('focusDurationMin' in legacy).toBe(false);
    // O campo novo vence se os dois existirem.
    expect(
      preferencesSchema.parse({ focusDurationMin: 45, focusDurationSec: 1530 }).focusDurationSec,
    ).toBe(1530);
    // Limites continuam valendo para o formato antigo.
    expect(preferencesSchema.safeParse({ focusDurationMin: 181 }).success).toBe(false);
    expect(preferencesSchema.safeParse({ focusDurationMin: 0 }).success).toBe(false);
  });

  it('um dado v2 salvo ANTES desta mudança (com focusDurationMin) abre normalmente', () => {
    const storage = new MemoryStorage();
    const old = makeSnapshot();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        app: 'daily',
        version: 2,
        savedAt: '2026-11-01T12:00:00.000Z',
        data: {
          ...old,
          preferences: {
            name: 'Leo',
            waterGoalMl: 2500,
            cupMl: 300,
            focusDurationMin: 50,
            lockByDefault: false,
          },
        },
      }),
    );
    const repo = new LocalStorageRepository(storage);
    expect(repo.issue).toBeNull();
    expect(repo.preferences.get()).toMatchObject({
      name: 'Leo',
      waterGoalMl: 2500,
      focusDurationSec: 3000,
    });
  });
});
