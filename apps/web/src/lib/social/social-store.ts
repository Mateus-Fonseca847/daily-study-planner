import { create } from 'zustand';
import { useAuth } from '../auth/auth-store';
import { getSupabase } from '../cloud/client';
import {
  clearSocialCache,
  readAvatar,
  readSocialCache,
  writeAvatar,
  writeSocialCache,
  type SocialCache,
} from './cache';
import { SocialError, toSocialError } from './errors';
import {
  createSocialRepository,
  type ProfilePatch,
  type SocialProfile,
  type SocialRepository,
  type UsernameStatus,
} from './repository';

/**
 * Estado do perfil social. `idle` até alguém abrir a seção (nenhuma requisição antes disso);
 * `indisponivel` quando o banco ainda não tem as tabelas (migração não aplicada) — o resto do
 * app nunca depende disto.
 */
export type SocialPhase = 'idle' | 'loading' | 'ready' | 'indisponivel' | 'erro' | 'sem_login';

interface SocialState {
  phase: SocialPhase;
  profile: SocialProfile | null;
  error: SocialError | null;
  /** `blob:` da foto do próprio usuário (ou `null`). */
  avatarUrl: string | null;
  /** O que já se sabe sem rede (para a topbar e o convite no Perfil). */
  cached: SocialCache | null;
  load(): Promise<void>;
  activate(
    input: { birthDate: string; username: string; displayName: string },
    avatar?: Blob | null,
  ): Promise<void>;
  update(patch: ProfilePatch): Promise<void>;
  changeUsername(username: string): Promise<void>;
  setActive(active: boolean): Promise<void>;
  uploadAvatar(webp: Blob): Promise<void>;
  removeAvatar(): Promise<void>;
  deleteProfile(): Promise<void>;
  /** Situação de um @ para a pessoa logada (com o limite de taxa do servidor). */
  checkUsername(name: string): Promise<UsernameStatus>;
  /** Lê o cache do usuário logado (sem rede). */
  hydrate(): void;
}

/** Fábrica injetável (os testes trocam o repositório). */
export let repositoryFor = (userId: string): SocialRepository | null => {
  const client = getSupabase();
  return client ? createSocialRepository(client, userId) : null;
};
export const setRepositoryFactory = (factory: typeof repositoryFor) => {
  repositoryFor = factory;
};

const userId = (): string | null => {
  const auth = useAuth.getState();
  return auth.status === 'signed-in' ? auth.user.id : null;
};

const cacheOf = (p: SocialProfile): SocialCache => ({
  username: p.username,
  displayName: p.displayName,
  avatarVersion: p.avatarVersion,
  hasAvatar: p.avatarPath !== null,
  disabled: p.disabledAt !== null,
});

let objectUrl: string | null = null;
const showBlob = (blob: Blob | null): string | null => {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = blob ? URL.createObjectURL(blob) : null;
  return objectUrl;
};

export const useSocial = create<SocialState>()((set, get) => {
  /** Repositório do usuário logado (ou erro `sem_login`). */
  const repo = (): { id: string; repo: SocialRepository } => {
    const id = userId();
    const r = id ? repositoryFor(id) : null;
    if (!id || !r) throw new SocialError('sem_login');
    return { id, repo: r };
  };

  /** Atualiza o estado, o cache e a foto a partir do perfil do servidor. */
  const apply = async (id: string, r: SocialRepository, profile: SocialProfile | null) => {
    writeSocialCache(id, profile ? cacheOf(profile) : null);
    set({ profile, phase: 'ready', error: null, cached: profile ? cacheOf(profile) : null });
    if (!profile?.avatarPath) {
      set({ avatarUrl: showBlob(null) });
      return;
    }
    let blob = await readAvatar(id, profile.avatarVersion);
    if (!blob) {
      blob = await r.downloadAvatar().catch(() => null);
      if (blob) await writeAvatar(id, profile.avatarVersion, blob);
    }
    set({ avatarUrl: showBlob(blob) });
  };

  /** Executa uma ação e recarrega; o erro fica no estado e é relançado para a tela. */
  const act = async (run: (id: string, r: SocialRepository) => Promise<void>) => {
    const { id, repo: r } = repo();
    try {
      await run(id, r);
      await apply(id, r, await r.load());
    } catch (error) {
      const err = toSocialError(error);
      set({ error: err });
      throw err;
    }
  };

  return {
    phase: 'idle',
    profile: null,
    error: null,
    avatarUrl: null,
    cached: null,

    hydrate() {
      const id = userId();
      const cached = id ? readSocialCache(id) : null;
      set({ cached });
      if (id && cached?.hasAvatar) {
        void readAvatar(id, cached.avatarVersion).then((blob) => {
          if (blob && !get().avatarUrl) set({ avatarUrl: showBlob(blob) });
        });
      }
    },

    async load() {
      const id = userId();
      const r = id ? repositoryFor(id) : null;
      if (!id || !r) {
        set({ phase: 'sem_login', profile: null });
        return;
      }
      // Já carregando (ex.: o efeito roda duas vezes no modo estrito): não repete a requisição.
      if (get().phase === 'loading') return;
      set({ phase: 'loading', error: null });
      try {
        await apply(id, r, await r.load());
      } catch (error) {
        const err = toSocialError(error);
        set({ phase: err.kind === 'indisponivel' ? 'indisponivel' : 'erro', error: err });
      }
    },

    activate: (input, avatar) =>
      act(async (_id, r) => {
        await r.activate(input);
        if (avatar) await r.uploadAvatar(avatar, 0);
      }),
    update: (patch) => act((_id, r) => r.update(patch)),
    changeUsername: (username) => act((_id, r) => r.changeUsername(username)),
    setActive: (active) => act((_id, r) => r.setActive(active)),
    uploadAvatar: (webp) =>
      act(async (_id, r) => {
        await r.uploadAvatar(webp, get().profile?.avatarVersion ?? 0);
      }),
    removeAvatar: () => act((_id, r) => r.removeAvatar(get().profile?.avatarVersion ?? 0)),
    async checkUsername(name) {
      const { repo: r } = repo();
      return r.usernameStatus(name);
    },
    async deleteProfile() {
      await act(async (id, r) => {
        await r.deleteProfile();
        await clearSocialCache(id);
      });
    },
  };
});

/** Ao sair da conta: esquece o perfil e apaga o cache deste aparelho. */
export async function forgetSocial(userIdToClear: string | null): Promise<void> {
  if (userIdToClear) await clearSocialCache(userIdToClear);
  useSocial.setState({
    phase: 'idle',
    profile: null,
    error: null,
    cached: null,
    avatarUrl: showBlob(null),
  });
}

/**
 * Antes de `delete_my_account()`: a foto no Storage não sai em cascata com o usuário. Devolve
 * `'ok'` (apagada, ou não havia social no banco) ou a mensagem do erro.
 */
export async function removeSocialPhotoBeforeAccountDeletion(id: string | null): Promise<string> {
  const r = id ? repositoryFor(id) : null;
  if (!r) return 'ok';
  try {
    await r.removeAvatarFileOnly();
    return 'ok';
  } catch (error) {
    const err = toSocialError(error);
    return err.kind === 'indisponivel' ? 'ok' : err.message;
  }
}

/** Liga o social à conta: ao entrar ou trocar de usuário, lê só o cache local (sem rede). */
export function startSocial(): () => void {
  let last: string | null = null;
  const sync = () => {
    const id = userId();
    if (id === last) return;
    last = id;
    useSocial.setState({ phase: 'idle', profile: null, error: null, avatarUrl: showBlob(null) });
    useSocial.getState().hydrate();
  };
  sync();
  return useAuth.subscribe(sync);
}

/**
 * Para o arquivo de backup: perfil e aceites (sem a foto em binário). Só busca no servidor se este
 * aparelho sabe que o perfil existe (cache), para não gerar requisição para quem nunca ativou.
 * `null` = sem perfil social; `'erro'` = existe, mas não deu para buscar agora.
 */
export async function socialExport(): Promise<Record<string, unknown> | null | 'erro'> {
  const id = userId();
  if (!id || !readSocialCache(id)) return null;
  const r = repositoryFor(id);
  if (!r) return null;
  try {
    const { profile, consents } = await r.exportData();
    if (!profile) return null;
    return {
      perfil: {
        username: profile.username,
        nomeDeExibicao: profile.displayName,
        temFoto: profile.avatarPath !== null,
        mesDeNascimento: profile.birthMonth?.slice(0, 7) ?? null,
        privacidade: {
          descobrivel: profile.discoverable,
          mostrarMedalhas: profile.showAchievements,
          mostrarSequencias: profile.showStreaks,
          mostrarEstatisticas: profile.showStats,
        },
        ativadoEm: profile.socialEnabledAt,
        desativadoEm: profile.disabledAt,
      },
      consentimentos: consents,
    };
  } catch {
    return 'erro';
  }
}
