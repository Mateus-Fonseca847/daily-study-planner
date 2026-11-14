import { useEffect, useId, useState } from 'react';
import { Check, Clock, Loader2, Search, UserPlus } from 'lucide-react';
import {
  normalizeSearchTerm,
  SEARCH_MAX_LENGTH,
  SEARCH_TERM_MESSAGES,
  searchTermProblem,
} from '@daily/shared';
import { Button } from '../../components/ui/Button';
import type { SearchResult } from '../../lib/social/friends-repository';
import { relationAfterSend } from '../../lib/social/friends-state';
import { useFriends } from '../../lib/social/friends-store';
import { cn } from '../../lib/cn';
import { friendlyError } from './FriendsGate';
import { PersonRow } from './PersonRow';
import { usePersonActions } from './usePersonActions';

/** Espera depois da última tecla (o servidor também limita a 30 buscas por minuto). */
export const SEARCH_DEBOUNCE_MS = 400;

type SearchState =
  | { state: 'vazio' }
  | { state: 'regra'; message: string }
  | { state: 'buscando' }
  | { state: 'pronto'; term: string; results: SearchResult[] }
  | { state: 'erro'; message: string };

/** Busca por @ com espera depois da digitação; o termo é validado antes de ir ao servidor. */
function usePeopleSearch(raw: string) {
  const term = normalizeSearchTerm(raw);
  const problem = term === '' ? null : searchTermProblem(term);
  const search = useFriends((s) => s.search);
  const [remote, setRemote] = useState<{ term: string; result: SearchState } | null>(null);

  useEffect(() => {
    if (term === '' || problem) return;
    let alive = true;
    const timer = setTimeout(() => {
      search(term)
        .then((results) => alive && setRemote({ term, result: { state: 'pronto', term, results } }))
        .catch(
          (e: unknown) =>
            alive && setRemote({ term, result: { state: 'erro', message: friendlyError(e) } }),
        );
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [term, problem, search]);

  const view: SearchState =
    term === ''
      ? { state: 'vazio' }
      : problem
        ? { state: 'regra', message: SEARCH_TERM_MESSAGES[problem] }
        : remote?.term === term
          ? remote.result
          : { state: 'buscando' };

  /** Atualiza um resultado (ação feita) sem nova busca. */
  const patch = (id: string, change: Partial<SearchResult> | null) =>
    setRemote((current) => {
      if (!current || current.result.state !== 'pronto') return current;
      const results = current.result.results.flatMap((r) =>
        r.id !== id ? [r] : change === null ? [] : [{ ...r, ...change }],
      );
      return { ...current, result: { ...current.result, results } };
    });

  return { view, patch };
}

/** Ação de um resultado conforme a relação: Adicionar, Pendente, Aceitar ou Amigos. */
function ResultAction({
  result,
  onDone,
}: {
  result: SearchResult;
  onDone: (change: Partial<SearchResult>, error?: string) => void;
}) {
  const send = useFriends((s) => s.send);
  const [busy, setBusy] = useState(false);
  const handle = `@${result.username}`;

  if (result.relation === 'enviada') {
    return (
      <span className="inline-flex h-control items-center gap-1.5 px-2 text-sm text-muted">
        <Clock aria-hidden strokeWidth={1.5} className="size-icon-sm" />
        Pendente
      </span>
    );
  }
  if (result.relation === 'amigos') {
    return (
      <span className="inline-flex h-control items-center gap-1.5 px-2 text-sm text-concluido">
        <Check aria-hidden strokeWidth={2} className="size-icon-sm" />
        Amigos
      </span>
    );
  }
  const accept = result.relation === 'recebida';
  return (
    <Button
      variant={accept ? 'primary' : 'secondary'}
      disabled={busy}
      aria-label={accept ? `Aceitar o pedido de ${handle}` : `Adicionar ${handle}`}
      onClick={() => {
        setBusy(true);
        // Otimista: mostra o novo estado na hora e volta se o servidor recusar.
        onDone({ relation: accept ? 'amigos' : 'enviada' });
        send(result)
          .then((r) => onDone({ relation: relationAfterSend(r) }))
          .catch((e: unknown) => onDone({ relation: result.relation }, friendlyError(e)))
          .finally(() => setBusy(false));
      }}
    >
      {!accept && <UserPlus aria-hidden strokeWidth={1.5} className="size-icon-sm" />}
      {accept ? 'Aceitar' : 'Adicionar'}
    </Button>
  );
}

/** Buscar pessoas pelo @ (prefixo ou exato). Sem foto: ela só aparece depois de amigos. */
export function PeopleSearch({ autoFocus = false }: { autoFocus?: boolean }) {
  const [raw, setRaw] = useState('');
  const { view, patch } = usePeopleSearch(raw);
  const [message, setMessage] = useState<string | null>(null);
  const { menuFor, dialog } = usePersonActions();
  const inputId = useId();
  const statusId = useId();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm text-muted">
          Buscar pelo @
        </label>
        <div className="flex h-select items-center gap-2 rounded-md border-hair bg-raised px-3 focus-within:outline-2 focus-within:outline-focus-ring">
          <Search aria-hidden strokeWidth={1.5} className="size-icon shrink-0 text-muted" />
          <input
            id={inputId}
            type="search"
            // Formulário de busca: o teclado do celular não corrige nem capitaliza o @.
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            enterKeyHint="search"
            autoFocus={autoFocus}
            maxLength={SEARCH_MAX_LENGTH + 1}
            placeholder="ex.: ana.lima"
            aria-describedby={statusId}
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setMessage(null);
            }}
            className="h-full min-w-0 flex-1 bg-transparent text-md text-fg outline-none placeholder:text-muted focus-visible:outline-none! focus-visible:shadow-none!"
          />
        </div>
      </div>

      <div id={statusId} aria-live="polite" className="text-sm text-muted">
        {view.state === 'vazio' &&
          'Digite pelo menos 3 caracteres do @. Só aparecem perfis que escolheram aparecer na busca.'}
        {view.state === 'regra' && view.message}
        {view.state === 'buscando' && (
          <span className="inline-flex items-center gap-2">
            <Loader2
              aria-hidden
              strokeWidth={1.5}
              className="size-icon-sm motion-safe:animate-spin"
            />
            Buscando…
          </span>
        )}
        {view.state === 'pronto' &&
          (view.results.length === 0
            ? `Ninguém encontrado com “${view.term}”.`
            : view.results.length === 1
              ? '1 pessoa encontrada.'
              : `${view.results.length} pessoas encontradas.`)}
      </div>

      {view.state === 'erro' && (
        <p role="alert" className="text-md text-danger">
          {view.message}
        </p>
      )}
      {message && (
        <p role="alert" className="text-md text-danger">
          {message}
        </p>
      )}

      {view.state === 'pronto' && view.results.length > 0 && (
        <ul aria-label="Resultados da busca" className={cn('flex flex-col')}>
          {view.results.map((r) => (
            <PersonRow
              key={r.id}
              displayName={r.displayName}
              username={r.username}
              menu={menuFor(r, { after: () => patch(r.id, null) })}
            >
              <ResultAction
                result={r}
                onDone={(change, error) => {
                  patch(r.id, change);
                  if (error) setMessage(error);
                }}
              />
            </PersonRow>
          ))}
        </ul>
      )}
      {dialog}
    </div>
  );
}
