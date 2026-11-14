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
  friends: FakeFriends;
}

/** Outra pessoa do mundo simulado (as regras de verdade são testadas no banco, pelo pgTAP). */
export interface FakePerson {
  id: string;
  username: string;
  nome: string;
  discoverable: boolean;
  /** Foto (só amigos recebem o link assinado). */
  avatar?: Buffer;
}

export interface FakeFriends {
  /** `false`: as funções do Prompt 16 não existem (migração não aplicada). */
  migrated: boolean;
  people: FakePerson[];
  friends: string[];
  incoming: { id: number; from: string }[];
  outgoing: { id: number; to: string }[];
  blocked: { id: string; username: string; nome: string }[];
  reports: { pessoa: string; motivo: string; detalhe: string | null; bloquear: boolean }[];
  sendsLeft: number;
  reportsLeft: number;
  nextId: number;
}

export const person = (
  id: string,
  username: string,
  nome: string,
  discoverable = true,
): FakePerson => ({ id, username, nome, discoverable });

export const BIA = person('22222222-2222-4222-8222-222222222222', 'bia', 'Bia Souza');
export const CAIO = person('33333333-3333-4333-8333-333333333333', 'caio', 'Caio Lima');
export const DUDA = person('44444444-4444-4444-8444-444444444444', 'duda', 'Duda Reis');

export function friendsState(patch: Partial<FakeFriends> = {}): FakeFriends {
  return {
    migrated: true,
    people: [BIA, CAIO, DUDA],
    friends: [],
    incoming: [],
    outgoing: [],
    blocked: [],
    reports: [],
    sendsLeft: 20,
    reportsLeft: 5,
    nextId: 100,
    ...patch,
  };
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
    friends: friendsState(),
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

/** As funções `social_*` do Prompt 16, simuladas em memória. */
function friendsRpc(state: FakeState, fn: string, body: Record<string, unknown>): unknown {
  const f = state.friends;
  const who = (id: unknown) => f.people.find((p) => p.id === id);
  const isBlocked = (id: string) => f.blocked.some((b) => b.id === id);
  const relation = (id: string) =>
    f.friends.includes(id)
      ? 'amigos'
      : f.incoming.some((r) => r.from === id)
        ? 'recebida'
        : f.outgoing.some((r) => r.to === id)
          ? 'enviada'
          : 'nenhuma';
  const row = (p: FakePerson) => ({ id: p.id, username: p.username, nome: p.nome });
  const unlink = (id: string) => {
    f.friends = f.friends.filter((x) => x !== id);
    f.incoming = f.incoming.filter((r) => r.from !== id);
    f.outgoing = f.outgoing.filter((r) => r.to !== id);
  };
  const requestRow = (p: FakePerson, id: number) => ({
    ...row(p),
    id,
    pessoa: p.id,
    criada: '2026-11-15T09:00:00Z',
  });
  switch (fn) {
    case 'social_buscar_perfis': {
      const term = String(body.termo ?? '')
        .trim()
        .toLowerCase()
        .replace(/^@/, '');
      if (term.length < 3) return { status: 'termo_invalido', itens: [] };
      const itens = f.people
        .filter((p) => p.discoverable && p.username.startsWith(term) && !isBlocked(p.id))
        .map((p) => ({ ...row(p), relacao: relation(p.id) }));
      return { status: 'ok', itens };
    }
    case 'social_enviar_solicitacao': {
      const p = who(body.para);
      if (f.sendsLeft <= 0) return 'limite_diario';
      f.sendsLeft -= 1;
      if (!p || isBlocked(p.id)) return 'nao_encontrado';
      if (f.friends.includes(p.id)) return 'ja_amigos';
      if (f.incoming.some((r) => r.from === p.id)) {
        unlink(p.id);
        f.friends.push(p.id);
        return 'aceita';
      }
      if (!f.outgoing.some((r) => r.to === p.id)) f.outgoing.push({ id: f.nextId++, to: p.id });
      return 'ok';
    }
    case 'social_responder_solicitacao': {
      const r = f.incoming.find((x) => x.id === Number(body.pedido));
      if (!r) return 'nao_encontrado';
      f.incoming = f.incoming.filter((x) => x !== r);
      if (body.aceitar) f.friends.push(r.from);
      return 'ok';
    }
    case 'social_cancelar_solicitacao': {
      const before = f.outgoing.length;
      f.outgoing = f.outgoing.filter((x) => x.id !== Number(body.pedido));
      return before === f.outgoing.length ? 'nao_encontrado' : 'ok';
    }
    case 'social_desfazer_amizade': {
      if (!f.friends.includes(String(body.amigo))) return 'nao_encontrado';
      f.friends = f.friends.filter((x) => x !== body.amigo);
      return 'ok';
    }
    case 'social_listar_amigos':
      return {
        status: 'ok',
        itens: f.friends.flatMap((id) => {
          const p = who(id);
          return p
            ? [
                {
                  ...row(p),
                  tem_foto: Boolean(p.avatar),
                  versao_foto: 1,
                  desde: '2026-11-15T10:00:00Z',
                },
              ]
            : [];
        }),
      };
    case 'social_listar_solicitacoes':
      return {
        status: 'ok',
        recebidas: f.incoming.flatMap((r) => {
          const p = who(r.from);
          return p ? [requestRow(p, r.id)] : [];
        }),
        enviadas: f.outgoing.flatMap((r) => {
          const p = who(r.to);
          return p ? [requestRow(p, r.id)] : [];
        }),
      };
    case 'social_contar_solicitacoes_recebidas':
      return { status: 'ok', total: f.incoming.length };
    case 'social_bloquear': {
      const p = who(body.pessoa);
      if (p && !isBlocked(p.id)) {
        f.blocked.unshift({ id: p.id, username: p.username, nome: p.nome });
      }
      if (p) unlink(p.id);
      return 'ok';
    }
    case 'social_desbloquear':
      f.blocked = f.blocked.filter((b) => b.id !== body.pessoa);
      return 'ok';
    case 'social_listar_bloqueados':
      return {
        status: 'ok',
        itens: f.blocked.map((b) => ({ ...b, desde: '2026-11-15T10:00:00Z' })),
      };
    case 'social_denunciar': {
      if (f.reportsLeft <= 0) return 'limite';
      f.reportsLeft -= 1;
      f.reports.push({
        pessoa: String(body.pessoa),
        motivo: String(body.motivo),
        detalhe: (body.detalhe as string | null) ?? null,
        bloquear: Boolean(body.bloquear),
      });
      if (body.bloquear) friendsRpc(state, 'social_bloquear', { pessoa: body.pessoa });
      return 'ok';
    }
    default:
      return undefined;
  }
}

const FRIENDS_FUNCTIONS = new Set([
  'social_buscar_perfis',
  'social_enviar_solicitacao',
  'social_responder_solicitacao',
  'social_cancelar_solicitacao',
  'social_desfazer_amizade',
  'social_listar_amigos',
  'social_listar_solicitacoes',
  'social_contar_solicitacoes_recebidas',
  'social_bloquear',
  'social_desbloquear',
  'social_listar_bloqueados',
  'social_denunciar',
]);

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
      if (FRIENDS_FUNCTIONS.has(fn)) {
        if (!state.friends.migrated) {
          return json(route, { code: 'PGRST202', message: 'Could not find the function' }, 404);
        }
        return json(route, friendsRpc(state, fn, body));
      }
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

    // Fotos de amigos: links assinados (só para amigos) e o download pelo link.
    if (method === 'POST' && path === '/storage/v1/object/sign/avatars') {
      const { paths } = req.postDataJSON() as { paths: string[] };
      return json(
        route,
        paths.map((p) => {
          const owner = p.split('/')[0] ?? '';
          const friend = state.friends.friends.includes(owner);
          const avatar = state.friends.people.find((x) => x.id === owner)?.avatar;
          return friend && avatar
            ? { path: p, signedURL: `/object/sign/avatars/${p}?token=t`, error: null }
            : { path: p, signedURL: null, error: 'Object not found' };
        }),
      );
    }
    if (method === 'GET' && path.startsWith('/storage/v1/object/sign/avatars/')) {
      const owner = path.split('/')[6] ?? '';
      const avatar = state.friends.people.find((x) => x.id === owner)?.avatar;
      return avatar && state.friends.friends.includes(owner)
        ? route.fulfill({ status: 200, contentType: 'image/webp', body: avatar })
        : json(route, { statusCode: '400', error: 'InvalidJWT', message: 'invalid' }, 400);
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

/** Só as chamadas às funções de amizade (Prompt 16). */
export const friendsCalls = (state: FakeState) =>
  state.requests.filter((r) => [...FRIENDS_FUNCTIONS].some((fn) => r.endsWith(`/rpc/${fn}`)));

/** Simula que este aparelho já abriu o perfil social antes (cache local do próprio perfil). */
export async function rememberProfile(page: Page, username = 'ana.lima') {
  await page.addInitScript(
    ([key, value]) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    [
      `daily:social:${USER_ID}`,
      JSON.stringify({
        username,
        displayName: 'Ana Lima',
        avatarVersion: 0,
        hasAvatar: false,
        disabled: false,
      }),
    ] as const,
  );
}
