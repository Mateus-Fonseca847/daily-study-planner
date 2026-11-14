import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Achievement, DataSnapshot } from '@daily/shared';
import { DATA_VERSION } from '../data/envelope';
import { withAchievementsOf } from './engine';
import { fakeCloud, last, setup, withSubject } from './test-helpers';

const medal = (id: string, levels: string[], featured = false): Achievement => ({
  id,
  level: levels.length,
  levels,
  featured,
});
const withMedals = (
  base: DataSnapshot,
  achievements: Achievement[],
  seededAt: string | null = '2026-11-01T00:00:00',
): DataSnapshot => ({
  ...base,
  achievements,
  onboarding: { ...base.onboarding, achievementsSeededAt: seededAt },
});

describe('sincronização com o formato v6 (medalhas)', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
  afterEach(() => vi.useRealTimers());

  it('conflito → usar a nuvem: as medalhas do dispositivo ficam e a união sobe para a nuvem', async () => {
    const cloudData = withMedals(withSubject('nuvem'), [
      medal('ritmo', ['2026-03-01T12:00:00', '2026-05-01T12:00:00']),
    ]);
    const cloud = fakeCloud({ data: cloudData });
    const device = withMedals(
      withSubject('local'),
      [medal('ritmo', ['2026-02-01T12:00:00'], true), medal('constancia', ['2026-04-01T12:00:00'])],
      '2026-10-01T00:00:00',
    );
    const t = setup(cloud, device);
    await t.engine.start();
    expect(last(t.status)).toBe('conflict');
    await t.engine.resolveConflict('cloud');

    // Os dados são os da nuvem; as medalhas, a união (nível mais alto, data mais antiga).
    expect(t.snap.subjects[0]?.id).toBe('nuvem');
    expect(t.snap.achievements).toEqual([
      medal('ritmo', ['2026-02-01T12:00:00', '2026-05-01T12:00:00']),
      medal('constancia', ['2026-04-01T12:00:00']),
    ]);
    expect(t.snap.onboarding.achievementsSeededAt).toBe('2026-10-01T00:00:00');
    const row = cloud.row!;
    expect(row).toMatchObject({ revision: 2, version: DATA_VERSION });
    expect((row.data as DataSnapshot).achievements).toEqual(t.snap.achievements);
    expect(last(t.status)).toBe('synced');
  });

  it('conflito → usar este dispositivo: a nuvem recebe a união, sem perder a medalha dela', async () => {
    const cloud = fakeCloud({
      data: withMedals(withSubject('nuvem'), [medal('hidratado', ['2026-01-01T12:00:00'], true)]),
    });
    const t = setup(
      cloud,
      withMedals(withSubject('local'), [medal('ritmo', ['2026-02-01T12:00:00'], true)]),
    );
    await t.engine.start();
    await t.engine.resolveConflict('device');
    const data = cloud.row!.data as DataSnapshot;
    expect(data.subjects[0]?.id).toBe('local');
    expect(data.achievements.map((a) => [a.id, a.featured])).toEqual([
      ['ritmo', true],
      ['hidratado', false],
    ]);
    expect(t.snap.achievements).toEqual(data.achievements);
  });

  it('sem medalhas a acrescentar, a escolha fica como era (nada a reenviar)', async () => {
    const shared = [medal('ritmo', ['2026-02-01T12:00:00'])];
    const cloud = fakeCloud({ data: withMedals(withSubject('nuvem'), shared) });
    const t = setup(cloud, withMedals(withSubject('local'), shared));
    await t.engine.start();
    await t.engine.resolveConflict('cloud');
    expect(cloud.calls.update).toBe(0);
    expect(cloud.row!.revision).toBe(1);
  });

  it('app antigo (v5) diante de uma nuvem v6: não envia nada', async () => {
    const cloud = fakeCloud({ data: withMedals(withSubject('nuvem'), []), version: 6 });
    const t = setup(cloud, withSubject('local'), null, { dataVersion: 5 });
    await t.engine.start();
    expect(last(t.status)).toBe('outdated');
    expect(cloud.calls.update + cloud.calls.insert).toBe(0);
  });

  it('withAchievementsOf devolve o mesmo objeto quando não há o que unir', () => {
    const a = withMedals(withSubject('x'), [medal('ritmo', ['2026-02-01T12:00:00'])]);
    expect(withAchievementsOf(a, a)).toBe(a);
    expect(withAchievementsOf(a, withMedals(withSubject('y'), []))).toBe(a);
  });
});
