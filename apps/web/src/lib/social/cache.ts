import { browserStorage } from '../browser-storage';

/**
 * Cache local mínimo do PRÓPRIO perfil social, só para exibir (@, nome, versão da foto) sem ir ao
 * servidor. Fica fora do `daily:v6`, do backup e da sincronização; some ao sair da conta. Quem
 * nunca ativou não tem cache, e o app não faz nenhuma requisição social por isso.
 */
export interface SocialCache {
  username: string;
  displayName: string;
  avatarVersion: number;
  hasAvatar: boolean;
  disabled: boolean;
}

export const socialCacheKey = (userId: string) => `daily:social:${userId}`;
const AVATAR_CACHE = 'daily-avatar';
const avatarKey = (userId: string, version: number) =>
  `https://avatar.daily.local/${userId}/${version}.webp`;

export function readSocialCache(userId: string): SocialCache | null {
  try {
    const raw = browserStorage().getItem(socialCacheKey(userId));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<SocialCache>;
    if (typeof value.username !== 'string' || typeof value.displayName !== 'string') return null;
    return {
      username: value.username,
      displayName: value.displayName,
      avatarVersion: Number(value.avatarVersion) || 0,
      hasAvatar: value.hasAvatar === true,
      disabled: value.disabled === true,
    };
  } catch {
    return null;
  }
}

export function writeSocialCache(userId: string, value: SocialCache | null): void {
  try {
    if (value) browserStorage().setItem(socialCacheKey(userId), JSON.stringify(value));
    else browserStorage().removeItem(socialCacheKey(userId));
  } catch {
    /* sem armazenamento: só não guarda */
  }
}

const hasCaches = () => typeof caches !== 'undefined';

/** A foto daquela versão, se já foi baixada neste aparelho. */
export async function readAvatar(userId: string, version: number): Promise<Blob | null> {
  if (!hasCaches()) return null;
  try {
    const cache = await caches.open(AVATAR_CACHE);
    const hit = await cache.match(avatarKey(userId, version));
    return hit ? await hit.blob() : null;
  } catch {
    return null;
  }
}

/** Guarda a foto desta versão e apaga as outras (só a atual fica no aparelho). */
export async function writeAvatar(userId: string, version: number, blob: Blob): Promise<void> {
  if (!hasCaches()) return;
  try {
    const cache = await caches.open(AVATAR_CACHE);
    for (const request of await cache.keys()) {
      if (request.url.includes(`/${userId}/`)) await cache.delete(request);
    }
    await cache.put(
      avatarKey(userId, version),
      new Response(blob, { headers: { 'content-type': 'image/webp' } }),
    );
  } catch {
    /* sem Cache Storage: baixa de novo da próxima vez */
  }
}

/** Ao sair da conta ou excluir o perfil: nada do social fica no aparelho. */
export async function clearSocialCache(userId: string): Promise<void> {
  writeSocialCache(userId, null);
  if (!hasCaches()) return;
  try {
    const cache = await caches.open(AVATAR_CACHE);
    for (const request of await cache.keys()) {
      if (request.url.includes(`/${userId}/`)) await cache.delete(request);
    }
  } catch {
    /* ignora */
  }
}
