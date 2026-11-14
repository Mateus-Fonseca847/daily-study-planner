import type { Page, Request, Route } from '@playwright/test';

/**
 * Supabase SIMULADO por interceptação de rede (o CI nunca fala com um banco real). Responde ao
 * que o app usa: sessão (localStorage), sincronização (`user_data`), as tabelas e funções do
 * perfil social e o Storage de fotos. As regras de verdade (RLS, idade, @) são testadas no banco
 * pelo pgTAP; aqui o objetivo é o fluxo da interface.
 */
export const CLOUD = 'http://localhost:54321';
export const USER_ID = '11111111-1111-4111-8111-111111111111';

export interface FakeProfile {
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

export interface FakeState {
  /** `false`: as tabelas do social não existem (migração não aplicada). */
  migrated: boolean;
  profile: FakeProfile | null;
  birthMonth: string | null;
  avatar: Buffer | null;
  taken: Set<string>;
  /** Quantas próximas leituras de `profiles` falham por rede. */
  failNextLoads: number;
  requests: string[];
  activateCalls: unknown[];
}

const RESERVED = new Set(['admin', 'suporte', 'daily', 'perfil']);

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');

/** Sessão salva como o supabase-js guarda (chave `sb-localhost-auth-token`). */
export async function signIn(page: Page, name = 'Ana Lima') {
  const exp = Math.floor(Date.now() / 1000) + 3600 * 24 * 365;
  const user = {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'ana@teste.local',
    user_metadata: { full_name: name, name },
    app_metadata: { provider: 'google' },
    created_at: '2026-01-01T00:00:00Z',
  };
  const session = {
    access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USER_ID, exp, role: 'authenticated' })}.sig`,
    token_type: 'bearer',
    expires_in: 3600 * 24 * 365,
    expires_at: exp,
    refresh_token: 'refresh-falso',
    user,
  };
  await page.addInitScript(
    ([key, value]) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    ['sb-localhost-auth-token', JSON.stringify(session)] as const,
  );
}

export function initialState(patch: Partial<FakeState> = {}): FakeState {
  return {
    migrated: true,
    profile: null,
    birthMonth: null,
    avatar: null,
    taken: new Set(['bia']),
    failNextLoads: 0,
    requests: [],
    activateCalls: [],
    ...patch,
  };
}

export const profileRow = (patch: Partial<FakeProfile> = {}): FakeProfile => ({
  user_id: USER_ID,
  username: 'ana.lima',
  display_name: 'Ana Lima',
  avatar_path: null,
  avatar_version: 0,
  discoverable: false,
  show_achievements: true,
  show_streaks: false,
  show_stats: false,
  created_at: '2026-11-15T10:00:00Z',
  social_enabled_at: '2026-11-15T10:00:00Z',
  disabled_at: null,
  username_changed_at: null,
  ...patch,
});

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const missing = (route: Route) =>
  json(route, { code: 'PGRST205', message: 'Could not find the table in the schema cache' }, 404);
const wantsObject = (req: Request) =>
  (req.headers()['accept'] ?? '').includes('application/vnd.pgrst.object');

function usernameStatus(state: FakeState, name: string): string {
  if (!/^[a-z0-9]+([._][a-z0-9]+)*$/.test(name) || name.length < 3 || name.length > 20) {
    return 'invalido';
  }
  if (RESERVED.has(name)) return 'reservado';
  if (state.taken.has(name) && state.profile?.username !== name) return 'em_uso';
  return 'ok';
}

/** Liga o backend falso na página. Devolve o estado (mutável) para as verificações. */
export async function fakeSupabase(page: Page, state: FakeState = initialState()) {
  await page.route(`${CLOUD}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();
    state.requests.push(`${method} ${path}`);

    // Auth (refresh e leitura do usuário, se o cliente pedir).
    if (path.startsWith('/auth/v1/')) return json(route, {});

    // Sincronização dos estudos: nuvem vazia, aceita o que vier.
    if (path === '/rest/v1/user_data') {
      if (method === 'GET') return json(route, []);
      const row = { data: {}, version: 6, revision: 1, updated_at: '2026-11-15T10:00:00Z' };
      return json(route, wantsObject(req) ? row : [row], 201);
    }

    const social =
      path.startsWith('/rest/v1/profiles') ||
      path.startsWith('/rest/v1/profile_private') ||
      path.startsWith('/rest/v1/consents') ||
      path.startsWith('/rest/v1/rpc/social_');
    if (social && !state.migrated) return missing(route);

    if (path === '/rest/v1/profiles') {
      if (method === 'GET') {
        if (state.failNextLoads > 0) {
          state.failNextLoads -= 1;
          return route.abort('internetdisconnected');
        }
        return json(route, state.profile ? [state.profile] : []);
      }
      if (method === 'PATCH' && state.profile) {
        state.profile = { ...state.profile, ...(req.postDataJSON() as Partial<FakeProfile>) };
        return route.fulfill({ status: 204 });
      }
    }
    if (path === '/rest/v1/profile_private') {
      return json(route, state.birthMonth ? [{ birth_month: state.birthMonth }] : []);
    }
    if (path === '/rest/v1/consents') {
      return json(
        route,
        state.profile
          ? [
              {
                kind: 'perfil_social',
                text_version: 'perfil-social-2026-11',
                accepted_at: '2026-11-15T10:00:00Z',
                revoked_at: null,
              },
            ]
          : [],
      );
    }

    if (path.startsWith('/rest/v1/rpc/')) {
      const fn = path.slice('/rest/v1/rpc/'.length);
      const body = (req.postDataJSON() ?? {}) as Record<string, unknown>;
      if (fn === 'social_username_status') {
        return json(route, usernameStatus(state, String(body.candidate)));
      }
      if (fn === 'social_activate') {
        state.activateCalls.push(body);
        const status = usernameStatus(state, String(body.chosen_username));
        if (status !== 'ok') return json(route, status);
        state.profile = profileRow({
          username: String(body.chosen_username),
          display_name: String(body.chosen_display_name),
        });
        state.birthMonth = `${String(body.birth_date).slice(0, 7)}-01`;
        state.taken.add(state.profile.username);
        return json(route, 'ok');
      }
      if (fn === 'social_change_username' && state.profile) {
        const next = String(body.new_username);
        const status = usernameStatus(state, next);
        if (status !== 'ok') return json(route, status);
        state.profile = {
          ...state.profile,
          username: next,
          username_changed_at: new Date().toISOString(),
        };
        return json(route, 'ok');
      }
      if (fn === 'social_set_active' && state.profile) {
        state.profile = {
          ...state.profile,
          disabled_at: body.active ? null : new Date().toISOString(),
        };
        return route.fulfill({ status: 204 });
      }
      if (fn === 'social_delete_profile') {
        if (state.avatar) {
          return json(route, { code: '55000', message: 'social:foto_pendente' }, 400);
        }
        state.profile = null;
        state.birthMonth = null;
        return route.fulfill({ status: 204 });
      }
      if (fn === 'delete_my_account') return route.fulfill({ status: 204 });
    }

    // Storage: upload, download e remoção da foto.
    if (path.startsWith('/storage/v1/object')) {
      if (method === 'POST' && path.includes('/avatars/')) {
        // O supabase-js envia multipart/form-data: o arquivo é o bloco RIFF/WEBP dentro do corpo.
        const body = req.postDataBuffer() ?? Buffer.alloc(0);
        const start = body.indexOf('RIFF');
        state.avatar =
          start >= 0 ? body.subarray(start, start + 8 + body.readUInt32LE(start + 4)) : body;
        return json(route, { Key: 'avatars/foto' });
      }
      if (method === 'GET' && path.includes('/avatars/')) {
        return state.avatar
          ? route.fulfill({ status: 200, contentType: 'image/webp', body: state.avatar })
          : json(
              route,
              { statusCode: '404', error: 'not_found', message: 'Object not found' },
              400,
            );
      }
      if (method === 'DELETE') {
        state.avatar = null;
        return json(route, []);
      }
    }

    return json(route, { message: `rota não simulada: ${method} ${path}` }, 404);
  });
  return state;
}

/** Só as requisições do perfil social (tabelas, funções e Storage). */
export const socialRequests = (state: FakeState) =>
  state.requests.filter((r) =>
    /\/rest\/v1\/(profiles|profile_private|consents|rpc\/social_)|\/storage\/v1\//.test(r),
  );
