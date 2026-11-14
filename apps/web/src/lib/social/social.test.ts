import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/auth-store';
import { ensureOk, SOCIAL_MESSAGES, SocialError, toSocialError } from './errors';
import type { SocialProfile, SocialRepository } from './repository';
import { setRepositoryFactory, useSocial } from './social-store';

describe('erros do Supabase → mensagens em pt-BR', () => {
  it('código vindo das funções do banco', () => {
    expect(toSocialError({ message: 'social:menor_restrito' }).kind).toBe('menor_restrito');
    expect(toSocialError({ code: '55000', message: 'social:foto_pendente' }).message).toBe(
      SOCIAL_MESSAGES.foto_pendente,
    );
  });

  it('tabela, função ou bucket ausentes = recurso indisponível (migração não aplicada)', () => {
    for (const code of ['42P01', 'PGRST205', 'PGRST202']) {
      expect(toSocialError({ code, message: 'x' }).kind).toBe('indisponivel');
    }
    expect(toSocialError({ message: 'Bucket not found' }).kind).toBe('indisponivel');
  });

  it('rede, permissão e desconhecido', () => {
    expect(toSocialError(new TypeError('Failed to fetch')).kind).toBe('rede');
    expect(toSocialError({ code: '42501', message: 'permission denied' }).kind).toBe('sem_login');
    expect(toSocialError({ code: 'XX000', message: '???' }).kind).toBe('desconhecido');
  });

  it('código devolvido por uma função: ok passa; o resto vira erro', () => {
    expect(() => ensureOk('ok')).not.toThrow();
    expect(() => ensureOk('em_uso')).toThrow(SOCIAL_MESSAGES.em_uso);
    expect(() => ensureOk('troca_recente')).toThrow(/30 dias/);
    expect(() => ensureOk(42)).toThrow(SOCIAL_MESSAGES.desconhecido);
  });

  it('todas as mensagens estão em pt-BR e terminam com ponto', () => {
    for (const message of Object.values(SOCIAL_MESSAGES)) expect(message).toMatch(/\.$/);
  });
});

const profile = (patch: Partial<SocialProfile> = {}): SocialProfile => ({
  userId: 'u1',
  username: 'ana',
  displayName: 'Ana',
  avatarPath: null,
  avatarVersion: 0,
  discoverable: false,
  showAchievements: true,
  showStreaks: false,
  showStats: false,
  createdAt: '2026-11-15T10:00:00Z',
  socialEnabledAt: '2026-11-15T10:00:00Z',
  disabledAt: null,
  usernameChangedAt: null,
  suspendedAt: null,
  suspendedReason: null,
  birthMonth: '2000-05-01',
  ...patch,
});

/** Repositório falso em memória, contando as chamadas. */
function fakeRepo(initial: SocialProfile | null, fail?: SocialError) {
  let current = initial;
  const calls: string[] = [];
  const repo = {
    load: vi.fn(async () => {
      calls.push('load');
      if (fail) throw fail;
      return current;
    }),
    activate: vi.fn(async (input: { username: string; displayName: string }) => {
      calls.push('activate');
      current = profile({ username: input.username, displayName: input.displayName });
    }),
    update: vi.fn(async (patch: Partial<SocialProfile>) => {
      calls.push('update');
      current = { ...current!, ...patch };
    }),
    changeUsername: vi.fn(async (username: string) => {
      calls.push('changeUsername');
      current = { ...current!, username };
    }),
    setActive: vi.fn(async (active: boolean) => {
      calls.push('setActive');
      current = { ...current!, disabledAt: active ? null : '2026-11-15T11:00:00Z' };
    }),
    uploadAvatar: vi.fn(async () => {
      calls.push('uploadAvatar');
      current = {
        ...current!,
        avatarPath: 'u1/avatar.webp',
        avatarVersion: current!.avatarVersion + 1,
      };
      return current.avatarVersion;
    }),
    downloadAvatar: vi.fn(async () => new Blob(['x'], { type: 'image/webp' })),
    removeAvatar: vi.fn(async () => {
      calls.push('removeAvatar');
      current = { ...current!, avatarPath: null };
    }),
    deleteProfile: vi.fn(async () => {
      calls.push('deleteProfile');
      current = null;
    }),
    removeAvatarFileOnly: vi.fn(),
    exportData: vi.fn(),
    usernameStatus: vi.fn(),
  };
  return { repo: repo as unknown as SocialRepository, calls };
}

describe('store do perfil social', () => {
  beforeEach(() => {
    globalThis.URL.createObjectURL = () => 'blob:foto';
    globalThis.URL.revokeObjectURL = () => {};
    useAuth.setState({
      status: 'signed-in',
      user: { id: 'u1', email: 'ana@x', name: 'Ana', avatarUrl: null },
    } as never);
    useSocial.setState({
      phase: 'idle',
      profile: null,
      error: null,
      avatarUrl: null,
      cached: null,
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('nenhuma requisição até alguém abrir a seção (idle)', () => {
    const { repo, calls } = fakeRepo(null);
    setRepositoryFactory(() => repo);
    useSocial.getState().hydrate();
    expect(calls).toEqual([]);
    expect(useSocial.getState().phase).toBe('idle');
  });

  it('sem login: sem_login, sem requisição', async () => {
    useAuth.setState({ status: 'visitor' } as never);
    const { repo, calls } = fakeRepo(null);
    setRepositoryFactory(() => repo);
    await useSocial.getState().load();
    expect(useSocial.getState().phase).toBe('sem_login');
    expect(calls).toEqual([]);
  });

  it('tabelas ausentes: recurso indisponível, sem quebrar', async () => {
    const { repo } = fakeRepo(null, new SocialError('indisponivel'));
    setRepositoryFactory(() => repo);
    await useSocial.getState().load();
    expect(useSocial.getState().phase).toBe('indisponivel');
  });

  it('falha de rede vira erro com mensagem; tentar de novo carrega', async () => {
    const failing = fakeRepo(null, new SocialError('rede'));
    setRepositoryFactory(() => failing.repo);
    await useSocial.getState().load();
    expect(useSocial.getState()).toMatchObject({ phase: 'erro' });
    expect(useSocial.getState().error?.message).toBe(SOCIAL_MESSAGES.rede);
    const ok = fakeRepo(profile());
    setRepositoryFactory(() => ok.repo);
    await useSocial.getState().load();
    expect(useSocial.getState()).toMatchObject({ phase: 'ready', error: null });
  });

  it('ativar com foto: perfil, upload e cache local mínimo', async () => {
    const { repo, calls } = fakeRepo(null);
    setRepositoryFactory(() => repo);
    await useSocial.getState().load();
    expect(useSocial.getState().profile).toBeNull();
    await useSocial
      .getState()
      .activate(
        { birthDate: '2000-05-10', username: 'ana', displayName: 'Ana' },
        new Blob(['x'], { type: 'image/webp' }),
      );
    expect(calls).toEqual(['load', 'activate', 'uploadAvatar', 'load']);
    expect(useSocial.getState().profile).toMatchObject({ username: 'ana', avatarVersion: 1 });
    expect(useSocial.getState().cached).toEqual({
      username: 'ana',
      displayName: 'Ana',
      avatarVersion: 1,
      hasAvatar: true,
      disabled: false,
    });
    expect(useSocial.getState().avatarUrl).toBe('blob:foto');
  });

  it('erro numa ação fica no estado e é relançado (a tela mostra)', async () => {
    const { repo } = fakeRepo(profile());
    repo.changeUsername = vi.fn(async () => {
      throw new SocialError('troca_recente');
    });
    setRepositoryFactory(() => repo);
    await useSocial.getState().load();
    await expect(useSocial.getState().changeUsername('nova')).rejects.toThrow(/30 dias/);
    expect(useSocial.getState().error?.kind).toBe('troca_recente');
  });

  it('desativar mantém o perfil; excluir apaga e limpa o cache', async () => {
    const { repo } = fakeRepo(profile({ avatarPath: 'u1/avatar.webp', avatarVersion: 2 }));
    setRepositoryFactory(() => repo);
    await useSocial.getState().load();
    await useSocial.getState().setActive(false);
    expect(useSocial.getState().profile?.disabledAt).not.toBeNull();
    await useSocial.getState().deleteProfile();
    expect(useSocial.getState().profile).toBeNull();
    expect(useSocial.getState().cached).toBeNull();
    expect(useSocial.getState().avatarUrl).toBeNull();
  });
});
