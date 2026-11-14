/**
 * Erros do perfil social em pt-BR. Os códigos vêm das funções do banco (`social:<código>` ou o
 * texto devolvido) e dos erros de rede/PostgREST.
 */
export type SocialErrorKind =
  | 'sem_login'
  | 'offline'
  | 'indisponivel'
  | 'rede'
  | 'invalido'
  | 'reservado'
  | 'em_uso'
  | 'limite'
  | 'menor_de_14'
  | 'menor_restrito'
  | 'data_invalida'
  | 'ja_ativo'
  | 'sem_consentimento'
  | 'nome_invalido'
  | 'troca_recente'
  | 'sem_perfil'
  | 'foto_pendente'
  | 'foto_invalida'
  | 'desconhecido';

export const SOCIAL_MESSAGES: Record<SocialErrorKind, string> = {
  sem_login: 'Entre com sua conta Google para usar o perfil social.',
  offline: 'Você está sem internet. O perfil social precisa de conexão.',
  indisponivel: 'O perfil social ainda não está disponível. O resto do Daily funciona normalmente.',
  rede: 'Não foi possível falar com o servidor. Tente de novo.',
  invalido: 'Este @ não segue as regras.',
  reservado: 'Este @ é reservado. Escolha outro.',
  em_uso: 'Este @ já está em uso. Escolha outro.',
  limite: 'Muitas tentativas em pouco tempo. Espere um pouco e tente de novo.',
  menor_de_14: 'O perfil social está disponível a partir dos 14 anos.',
  menor_restrito: 'Para menores de 18 anos, esta opção fica desligada.',
  data_invalida: 'Confira a data de nascimento.',
  ja_ativo: 'Seu perfil social já está ativo.',
  sem_consentimento: 'É preciso aceitar o termo para continuar.',
  nome_invalido: 'Confira o nome de exibição.',
  troca_recente: 'O @ só pode ser trocado uma vez a cada 30 dias.',
  sem_perfil: 'Você ainda não ativou o perfil social.',
  foto_pendente: 'Não foi possível apagar a foto. Tente de novo.',
  foto_invalida: 'Esta imagem não pode ser usada.',
  desconhecido: 'Algo deu errado. Tente de novo.',
};

export class SocialError extends Error {
  constructor(
    readonly kind: SocialErrorKind,
    message: string = SOCIAL_MESSAGES[kind],
  ) {
    super(message);
    this.name = 'SocialError';
  }
}

const KNOWN = new Set(Object.keys(SOCIAL_MESSAGES));

/** Tabela, função ou bucket ausentes: a migração ainda não foi aplicada. */
const MISSING_CODES = new Set(['42P01', 'PGRST205', 'PGRST202', '42883', 'PGRST106']);

interface ErrorLike {
  code?: unknown;
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
  name?: unknown;
}

/** Erro do Supabase (PostgREST, Storage, rede) → `SocialError` com mensagem em pt-BR. */
export function toSocialError(error: unknown): SocialError {
  if (error instanceof SocialError) return error;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return new SocialError('offline');
  }
  const e = (error ?? {}) as ErrorLike;
  const code = typeof e.code === 'string' ? e.code : '';
  const message = typeof e.message === 'string' ? e.message : '';
  const fromServer = /social:([a-z_0-9]+)/.exec(message)?.[1];
  if (fromServer && KNOWN.has(fromServer)) return new SocialError(fromServer as SocialErrorKind);
  if (MISSING_CODES.has(code) || /bucket not found/i.test(message)) {
    return new SocialError('indisponivel');
  }
  if (code === '42501') return new SocialError('sem_login');
  if (e.name === 'TypeError' || /fetch|network|failed to fetch/i.test(message)) {
    return new SocialError('rede');
  }
  return new SocialError('desconhecido');
}

/** Código devolvido por uma função (`'ok'` ou o problema) → lança se não for `'ok'`. */
export function ensureOk(status: unknown): void {
  if (status === 'ok') return;
  const kind = typeof status === 'string' && KNOWN.has(status) ? status : 'desconhecido';
  throw new SocialError(kind as SocialErrorKind);
}
