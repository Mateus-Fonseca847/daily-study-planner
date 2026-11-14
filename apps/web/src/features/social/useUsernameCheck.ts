import { useEffect, useState } from 'react';
import { normalizeUsername, USERNAME_MESSAGES, usernameProblem } from '@daily/shared';
import { SOCIAL_MESSAGES, SocialError } from '../../lib/social/errors';
import { useSocial } from '../../lib/social/social-store';

/** Espera depois da última tecla antes de consultar o servidor (respeita o limite de taxa). */
export const USERNAME_DEBOUNCE_MS = 500;

export type UsernameCheck =
  | { state: 'vazio' }
  | { state: 'checando' }
  | { state: 'livre' }
  | { state: 'problema'; message: string };

/**
 * Verifica o @ em tempo real: as regras de formato no próprio aparelho (sem rede) e, se o formato
 * está certo, a disponibilidade no servidor depois de uma pausa na digitação. `current` (o @ atual
 * da pessoa) não é consultado nem mostra situação.
 */
export function useUsernameCheck(raw: string, current?: string): UsernameCheck {
  const name = normalizeUsername(raw);
  const local = name === '' ? null : usernameProblem(name);
  const needsServer = name !== '' && local === null && name !== current;
  const [remote, setRemote] = useState<{ name: string; result: UsernameCheck } | null>(null);
  const check = useSocial((s) => s.checkUsername);

  useEffect(() => {
    if (!needsServer) return;
    let alive = true;
    const timer = setTimeout(() => {
      check(name)
        .then((status) => {
          if (!alive) return;
          const result: UsernameCheck =
            status === 'ok'
              ? { state: 'livre' }
              : { state: 'problema', message: SOCIAL_MESSAGES[status] };
          setRemote({ name, result });
        })
        .catch((error: unknown) => {
          if (!alive) return;
          const message =
            error instanceof SocialError ? error.message : SOCIAL_MESSAGES.desconhecido;
          setRemote({ name, result: { state: 'problema', message } });
        });
    }, USERNAME_DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [name, needsServer, check]);

  if (name === '') return { state: 'vazio' };
  if (local) return { state: 'problema', message: USERNAME_MESSAGES[local] };
  // O próprio @ atual: nada a verificar nem a mostrar.
  if (name === current) return { state: 'vazio' };
  return remote?.name === name ? remote.result : { state: 'checando' };
}
