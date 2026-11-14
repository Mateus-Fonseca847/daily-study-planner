import { z } from 'zod';

/**
 * Regras das amizades, iguais às do banco (supabase/migrations/20261116000003_friends_functions.sql).
 * O banco é quem garante; aqui é conveniência (validar antes de enviar e explicar os limites).
 */

/** Limites decididos pelo dono (o servidor impõe os mesmos). */
export const FRIEND_LIMITS = {
  /** Pedidos pendentes enviados ao mesmo tempo. */
  pendingSent: 20,
  /** Envios de pedido por dia. */
  sendsPerDay: 20,
  /** Amigos por pessoa. */
  friends: 200,
  /** Denúncias por dia. */
  reportsPerDay: 5,
  /** Quem enviou continua vendo “pendente” por até 7 dias depois de uma recusa. */
  refusedVisibleDays: 7,
  /** Carência para reenviar a quem recusou. */
  refusedCooldownDays: 30,
} as const;

/** Busca por @: 3 a 20 caracteres, até 10 resultados. */
export const SEARCH_MIN_LENGTH = 3;
export const SEARCH_MAX_LENGTH = 20;
export const SEARCH_MAX_RESULTS = 10;

/** Termo de busca como o servidor o lê: sem espaços nas pontas, sem o “@” inicial, minúsculo. */
export function normalizeSearchTerm(raw: string): string {
  const t = raw.trim().toLowerCase();
  return t.startsWith('@') ? t.slice(1) : t;
}

export type SearchTermProblem = 'curto' | 'longo' | 'caracteres';

/** Problema de um termo JÁ normalizado, ou `null` (vazio conta como curto). */
export function searchTermProblem(term: string): SearchTermProblem | null {
  if (term.length < SEARCH_MIN_LENGTH) return 'curto';
  if (term.length > SEARCH_MAX_LENGTH) return 'longo';
  if (!/^[a-z0-9._]+$/.test(term)) return 'caracteres';
  return null;
}

export const SEARCH_TERM_MESSAGES: Record<SearchTermProblem, string> = {
  curto: `Digite pelo menos ${SEARCH_MIN_LENGTH} caracteres do @.`,
  longo: `O @ tem no máximo ${SEARCH_MAX_LENGTH} caracteres.`,
  caracteres: 'Use só letras sem acento, números, ponto e sublinhado.',
};

/** Relação com outra pessoa, como a busca devolve. */
export const RELATIONS = ['nenhuma', 'enviada', 'recebida', 'amigos'] as const;
export type Relation = (typeof RELATIONS)[number];

/** Motivos de denúncia (mesmos valores do CHECK de `reports.reason`). */
export const REPORT_REASONS = [
  { value: 'perfil_improprio', label: 'Perfil impróprio' },
  { value: 'foto_impropria', label: 'Foto imprópria' },
  { value: 'assedio', label: 'Assédio ou ameaça' },
  { value: 'perfil_falso', label: 'Perfil falso ou se passando por outra pessoa' },
  { value: 'outro', label: 'Outro' },
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number]['value'];
export const REPORT_DETAIL_MAX = 500;

export const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS.map((r) => r.value) as [ReportReason, ...ReportReason[]]),
  detail: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(REPORT_DETAIL_MAX)),
  alsoBlock: z.boolean(),
});
export type ReportInput = z.input<typeof reportSchema>;
