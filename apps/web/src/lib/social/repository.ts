import type { SupabaseClient } from '@supabase/supabase-js';
import { PRIVACY_POLICY_VERSION, SOCIAL_CONSENT_VERSION } from '@daily/shared';
import { ensureOk, SocialError, toSocialError } from './errors';

/** O perfil social da própria pessoa (linha de `public.profiles` + o mês de nascimento). */
export interface SocialProfile {
  userId: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
  avatarVersion: number;
  discoverable: boolean;
  showAchievements: boolean;
  showStreaks: boolean;
  showStats: boolean;
  createdAt: string;
  socialEnabledAt: string;
  disabledAt: string | null;
  usernameChangedAt: string | null;
  /** `aaaa-mm-01` (só ano e mês). */
  birthMonth: string | null;
}

export interface Consent {
  kind: 'perfil_social' | 'politica_privacidade';
  textVersion: string;
  acceptedAt: string;
  revokedAt: string | null;
}

export type ProfilePatch = Partial<
  Pick<
    SocialProfile,
    'displayName' | 'discoverable' | 'showAchievements' | 'showStreaks' | 'showStats'
  >
>;

export type UsernameStatus = 'ok' | 'invalido' | 'reservado' | 'em_uso' | 'limite';

interface ProfileRow {
  user_id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
  avatar_version: number;
  discoverable: boolean;
  show_achievements: boolean;
  show_streaks: boolean;
  show_stats: boolean;
  created_at: string;
  social_enabled_at: string;
  disabled_at: string | null;
  username_changed_at: string | null;
}

const toProfile = (row: ProfileRow, birthMonth: string | null): SocialProfile => ({
  userId: row.user_id,
  username: row.username,
  displayName: row.display_name,
  avatarPath: row.avatar_path,
  avatarVersion: row.avatar_version,
  discoverable: row.discoverable,
  showAchievements: row.show_achievements,
  showStreaks: row.show_streaks,
  showStats: row.show_stats,
  createdAt: row.created_at,
  socialEnabledAt: row.social_enabled_at,
  disabledAt: row.disabled_at,
  usernameChangedAt: row.username_changed_at,
  birthMonth,
});

const PATCH_COLUMNS: Record<keyof ProfilePatch, string> = {
  displayName: 'display_name',
  discoverable: 'discoverable',
  showAchievements: 'show_achievements',
  showStreaks: 'show_streaks',
  showStats: 'show_stats',
};

export const AVATAR_BUCKET = 'avatars';
export const avatarPathOf = (userId: string) => `${userId}/avatar.webp`;

/** Todas as chamadas: só logado e online; erros viram `SocialError` em pt-BR. */
export async function call<T>(run: () => PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new SocialError('offline');
  }
  let result: { data: T; error: unknown };
  try {
    result = await run();
  } catch (error) {
    throw toSocialError(error);
  }
  if (result.error) throw toSocialError(result.error);
  return result.data;
}

/** Repositório do perfil social sobre o cliente Supabase (RLS: só o próprio usuário). */
export function createSocialRepository(client: SupabaseClient, userId: string) {
  const profiles = () => client.from('profiles');
  const storage = () => client.storage.from(AVATAR_BUCKET);

  return {
    /** O próprio perfil, ou `null` se ainda não ativou. Tabela ausente → `indisponivel`. */
    async load(): Promise<SocialProfile | null> {
      const row = await call(() =>
        profiles().select('*').eq('user_id', userId).maybeSingle<ProfileRow>(),
      );
      if (!row) return null;
      const priv = await call(() =>
        client
          .from('profile_private')
          .select('birth_month')
          .eq('user_id', userId)
          .maybeSingle<{ birth_month: string }>(),
      );
      return toProfile(row, priv?.birth_month ?? null);
    },

    async usernameStatus(candidate: string): Promise<UsernameStatus> {
      const status = await call(() => client.rpc('social_username_status', { candidate }));
      return status as UsernameStatus;
    },

    async activate(input: { birthDate: string; username: string; displayName: string }) {
      const status = await call(() =>
        client.rpc('social_activate', {
          birth_date: input.birthDate,
          chosen_username: input.username,
          chosen_display_name: input.displayName,
          consent_version: SOCIAL_CONSENT_VERSION,
          privacy_version: PRIVACY_POLICY_VERSION,
        }),
      );
      ensureOk(status);
    },

    async changeUsername(username: string) {
      ensureOk(await call(() => client.rpc('social_change_username', { new_username: username })));
    },

    async update(patch: ProfilePatch) {
      const row: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(patch)) {
        row[PATCH_COLUMNS[key as keyof ProfilePatch]] = value;
      }
      await call(() => profiles().update(row).eq('user_id', userId));
    },

    async setActive(active: boolean) {
      await call(() =>
        client.rpc(
          'social_set_active',
          active
            ? {
                active,
                consent_version: SOCIAL_CONSENT_VERSION,
                privacy_version: PRIVACY_POLICY_VERSION,
              }
            : { active },
        ),
      );
    },

    /** Envia a foto já processada (WebP 512×512) e sobe a versão. */
    async uploadAvatar(webp: Blob, currentVersion: number): Promise<number> {
      const path = avatarPathOf(userId);
      await call(() =>
        storage().upload(path, webp, {
          upsert: true,
          contentType: 'image/webp',
          cacheControl: '0',
        }),
      );
      const version = currentVersion + 1;
      await call(() =>
        profiles().update({ avatar_path: path, avatar_version: version }).eq('user_id', userId),
      );
      return version;
    },

    async downloadAvatar(): Promise<Blob> {
      const blob = await call(() => storage().download(avatarPathOf(userId)));
      if (!blob) throw new SocialError('rede');
      return blob;
    },

    /** Apaga o arquivo e limpa o perfil. */
    async removeAvatar(currentVersion: number) {
      await call(() => storage().remove([avatarPathOf(userId)]));
      await call(() =>
        profiles()
          .update({ avatar_path: null, avatar_version: currentVersion + 1 })
          .eq('user_id', userId),
      );
    },

    /** Exclui tudo do social: primeiro o arquivo (o banco recusa enquanto ele existir). */
    async deleteProfile() {
      await call(() => storage().remove([avatarPathOf(userId)]));
      await call(() => client.rpc('social_delete_profile'));
    },

    /** Para a exclusão da conta inteira: apaga a foto antes de `delete_my_account()`. */
    async removeAvatarFileOnly() {
      await call(() => storage().remove([avatarPathOf(userId)]));
    },

    /** Perfil e aceites, para o arquivo de backup (sem a foto em binário). */
    async exportData(): Promise<{ profile: SocialProfile | null; consents: Consent[] }> {
      const profile = await this.load();
      if (!profile) return { profile: null, consents: [] };
      const rows = await call(() =>
        client
          .from('consents')
          .select('kind, text_version, accepted_at, revoked_at')
          .eq('user_id', userId)
          .order('accepted_at'),
      );
      const consents = (
        (rows ?? []) as {
          kind: Consent['kind'];
          text_version: string;
          accepted_at: string;
          revoked_at: string | null;
        }[]
      ).map((c) => ({
        kind: c.kind,
        textVersion: c.text_version,
        acceptedAt: c.accepted_at,
        revokedAt: c.revoked_at,
      }));
      return { profile, consents };
    },
  };
}

export type SocialRepository = ReturnType<typeof createSocialRepository>;
