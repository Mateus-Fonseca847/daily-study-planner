import { z } from 'zod';

/**
 * Regras do perfil social, iguais às do banco (supabase/migrations/20261115000001_social_tables.sql).
 * O banco é quem garante; aqui é conveniência (mensagens antes de enviar). Os testes de
 * `social.test.ts` usam os mesmos casos do pgTAP e comparam a lista de reservados com a migração.
 */

/** Idade mínima para ter perfil social. */
export const MIN_SOCIAL_AGE = 14;
/** Idade a partir da qual os padrões deixam de ser os de adolescente. */
export const ADULT_AGE = 18;
/**
 * Versões dos textos aceitos (gravadas em `consents.text_version`). `…-11b` (Prompt 16): o termo e
 * a política passaram a descrever amigos, busca, bloqueio e denúncia. Quem aceitou a versão
 * anterior não precisa aceitar de novo (o novo texto vale para ativações e reativações).
 */
export const SOCIAL_CONSENT_VERSION = 'perfil-social-2026-11b';
export const PRIVACY_POLICY_VERSION = 'privacidade-2026-11b';
/** Troca de @: no máximo 1 a cada 30 dias; o antigo fica reservado por 90 dias. */
export const USERNAME_CHANGE_DAYS = 30;
export const USERNAME_HOLD_DAYS = 90;

/** Nomes que ninguém pode usar como @ (inclui as rotas do app). Mesma lista da migração. */
export const RESERVED_USERNAMES: readonly string[] = [
  'about',
  'adm',
  'admin',
  'administracao',
  'administrador',
  'ajuda',
  'amigos',
  'anonimo',
  'anonymous',
  'api',
  'app',
  'atalhos',
  'auth',
  'blocos',
  'blog',
  'busca',
  'buscar',
  'cadastro',
  'calendario',
  'config',
  'configuracoes',
  'conta',
  'contato',
  'convidar',
  'daily',
  'dailyapp',
  'dev',
  'email',
  'entrar',
  'equipe',
  'estatisticas',
  'everyone',
  'explorar',
  'faq',
  'foco',
  'habitos',
  'help',
  'login',
  'logout',
  'mail',
  'materias',
  'mod',
  'moderacao',
  'moderador',
  'notificacoes',
  'null',
  'official',
  'oficial',
  'perfil',
  'perfis',
  'preferencias',
  'privacidade',
  'provas',
  'root',
  'sair',
  'security',
  'seguranca',
  'signin',
  'signup',
  'sistema',
  'sobre',
  'social',
  'staff',
  'status',
  'suporte',
  'system',
  'tarefas',
  'termos',
  'test',
  'teste',
  'todos',
  'undefined',
  'user',
  'users',
  'usuario',
  'usuarios',
  'www',
];
const RESERVED = new Set(RESERVED_USERNAMES);

/** O que a pessoa digitou → candidato (sem espaços nas pontas, sem “@”, minúsculo). */
export const normalizeUsername = (raw: string): string =>
  raw.trim().replace(/^@+/, '').toLowerCase();

export type UsernameProblem =
  'curto' | 'longo' | 'caracteres' | 'bordas' | 'sequencia' | 'reservado';

export const USERNAME_MESSAGES: Record<UsernameProblem, string> = {
  curto: 'Use pelo menos 3 caracteres.',
  longo: 'Use no máximo 20 caracteres.',
  caracteres: 'Use só letras sem acento (a–z), números, ponto e sublinhado.',
  bordas: 'Comece e termine com letra ou número.',
  sequencia: 'Não use dois sinais seguidos (como “..” ou “._”).',
  reservado: 'Este @ é reservado. Escolha outro.',
};

/** O primeiro problema do @ (já normalizado), ou `null` se o formato é válido e não reservado. */
export function usernameProblem(name: string): UsernameProblem | null {
  if (name.length < 3) return 'curto';
  if (name.length > 20) return 'longo';
  if (!/^[a-z0-9._]+$/.test(name)) return 'caracteres';
  if (/^[._]|[._]$/.test(name)) return 'bordas';
  if (/[._]{2}/.test(name)) return 'sequencia';
  if (RESERVED.has(name)) return 'reservado';
  return null;
}

/** O mesmo formato do banco (`social_username_is_valid`): reservados à parte. */
export const USERNAME_PATTERN = /^[a-z0-9]+([._][a-z0-9]+)*$/;

/** Espelho de `social_username_is_valid` (tamanho + formato; reservados à parte). */
export const usernameFormatOk = (name: string): boolean =>
  name.length >= 3 && name.length <= 20 && USERNAME_PATTERN.test(name);

export const usernameSchema = z.string().superRefine((name, ctx) => {
  const problem = usernameProblem(name);
  if (problem) ctx.addIssue({ code: 'custom', message: USERNAME_MESSAGES[problem] });
});

/** Nome de exibição: 1 a 40 caracteres, sem caracteres de controle e não só espaços. */
export function displayNameProblem(name: string): string | null {
  if (name.trim() === '') return 'Informe um nome.';
  if ([...name].length > 40) return 'Use no máximo 40 caracteres.';
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f-\u009f]/.test(name)) return 'Remova caracteres especiais invisíveis.';
  return null;
}

export const displayNameSchema = z.string().superRefine((name, ctx) => {
  const problem = displayNameProblem(name);
  if (problem) ctx.addIssue({ code: 'custom', message: problem });
});

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const parts = (iso: string): [number, number, number] => {
  const m = DATE.exec(iso);
  if (!m) throw new Error(`Data inválida: ${iso}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

/** Data `aaaa-mm-dd` que existe no calendário (31/02 não existe). */
export function isRealDate(iso: string): boolean {
  if (!DATE.test(iso)) return false;
  const [y, m, d] = parts(iso);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Idade em anos completos, em datas LOCAIS (`aaaa-mm-dd`), igual ao `age()` do Postgres: faz
 * aniversário no próprio dia; quem nasceu em 29/02 completa o ano em 01/03 nos anos comuns.
 */
export function ageOn(birth: string, today: string): number {
  const [by, bm, bd] = parts(birth);
  const [ty, tm, td] = parts(today);
  const before = tm < bm || (tm === bm && td < bd);
  return ty - by - (before ? 1 : 0);
}

export type BirthDateProblem = 'invalida' | 'futura' | 'antiga' | 'menor_de_14';

/** Confere a data de nascimento para o perfil social (`null` = pode seguir). */
export function birthDateProblem(birth: string, today: string): BirthDateProblem | null {
  if (!isRealDate(birth)) return 'invalida';
  if (birth > today) return 'futura';
  if (birth < '1900-01-01') return 'antiga';
  if (ageOn(birth, today) < MIN_SOCIAL_AGE) return 'menor_de_14';
  return null;
}

/** 14 a 17 anos: padrões ainda mais restritos. */
export const isTeen = (birth: string, today: string): boolean => ageOn(birth, today) < ADULT_AGE;
