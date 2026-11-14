import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudOff, Loader2, TriangleAlert, UserRoundPlus, UsersRound, WifiOff } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../lib/auth/auth-store';
import { useOnline } from '../../lib/pwa/use-pwa';
import { SocialError } from '../../lib/social/errors';
import { useSocial } from '../../lib/social/social-store';

/** Mensagem de erro das amizades em pt-BR (sem rede: o aviso específico das amizades). */
export const OFFLINE_FRIENDS = 'Sem conexão: amigos exigem internet.';
export function friendlyError(error: unknown): string {
  if (error instanceof SocialError) {
    return error.kind === 'offline' ? OFFLINE_FRIENDS : error.message;
  }
  return 'Algo deu errado. Tente de novo.';
}

export type FriendsGateState =
  | 'oculto'
  | 'sem_login'
  | 'offline'
  | 'carregando'
  | 'indisponivel'
  | 'erro'
  | 'sem_perfil'
  | 'desativado'
  | 'suspenso'
  | 'ok';

/**
 * Pode usar amizades agora? Logado, online e com perfil social ATIVO. Para saber, lê o próprio
 * perfil (uma consulta, só quando alguém abre amigos ou a busca). Sem perfil: só o convite para
 * ativar, e nenhuma chamada de amizades acontece.
 */
export function useFriendsGate(): FriendsGateState {
  const status = useAuth((s) => s.status);
  const online = useOnline();
  const phase = useSocial((s) => s.phase);
  const profile = useSocial((s) => s.profile);
  const load = useSocial((s) => s.load);
  const signedIn = status === 'signed-in';

  useEffect(() => {
    if (signedIn && online && phase === 'idle') void load();
  }, [signedIn, online, phase, load]);

  if (status === 'disabled' || status === 'loading') return 'oculto';
  if (!signedIn) return 'sem_login';
  if (!online) return 'offline';
  if (phase === 'idle' || phase === 'loading') return 'carregando';
  if (phase === 'indisponivel') return 'indisponivel';
  if (phase === 'erro' || phase === 'sem_login') return 'erro';
  if (!profile) return 'sem_perfil';
  if (profile.suspendedAt) return 'suspenso';
  if (profile.disabledAt) return 'desativado';
  return 'ok';
}

/** Mostra o motivo (convite, offline, carregando…) ou, se está tudo certo, o conteúdo. */
export function FriendsGate({ children }: { children: ReactNode }) {
  const gate = useFriendsGate();
  const navigate = useNavigate();
  const load = useSocial((s) => s.load);
  const error = useSocial((s) => s.error);
  const suspendedReason = useSocial((s) => s.profile?.suspendedReason ?? null);

  switch (gate) {
    case 'ok':
      return <>{children}</>;
    case 'oculto':
      return (
        <EmptyState
          icon={CloudOff}
          title="Amigos indisponíveis"
          description="Amigos precisam da conta na nuvem, que não está configurada nesta versão."
        />
      );
    case 'sem_login':
      return (
        <EmptyState
          icon={UsersRound}
          title="Entre para encontrar amigos"
          description="Amigos precisam de uma conta. Entre com sua conta Google e ative o perfil social."
        >
          <Button onClick={() => navigate('/entrar')}>Entrar com Google</Button>
        </EmptyState>
      );
    case 'offline':
      return (
        <EmptyState
          icon={WifiOff}
          title="Sem conexão"
          description={`${OFFLINE_FRIENDS} O resto do Daily continua funcionando.`}
        />
      );
    case 'carregando':
      return (
        <p role="status" className="inline-flex items-center gap-2 text-md text-muted">
          <Loader2 aria-hidden strokeWidth={1.5} className="size-icon motion-safe:animate-spin" />
          Carregando…
        </p>
      );
    case 'indisponivel':
      return (
        <EmptyState
          icon={CloudOff}
          title="Ainda não disponível"
          description="Amigos e busca de pessoas ainda não estão disponíveis. O resto do Daily funciona normalmente."
        />
      );
    case 'erro':
      return (
        <EmptyState
          icon={TriangleAlert}
          title="Não foi possível carregar"
          description={friendlyError(error)}
        >
          <Button variant="secondary" onClick={() => void load()}>
            Tentar de novo
          </Button>
        </EmptyState>
      );
    case 'sem_perfil':
      return (
        <EmptyState
          icon={UserRoundPlus}
          title="Ative seu perfil social"
          description="Para buscar pessoas e adicionar amigos, ative o perfil social: escolha um @ e decida o que mostrar."
        >
          <Button onClick={() => navigate('/preferencias#perfil-social')}>
            Ativar perfil social
          </Button>
        </EmptyState>
      );
    case 'suspenso':
      return (
        <EmptyState
          icon={TriangleAlert}
          title="Perfil social suspenso"
          description={`Seu perfil social foi suspenso pela moderação: amigos e busca ficam indisponíveis.${suspendedReason ? ` Motivo: ${suspendedReason}` : ''} O resto do Daily funciona normalmente.`}
        />
      );
    case 'desativado':
      return (
        <EmptyState
          icon={UserRoundPlus}
          title="Perfil social desativado"
          description="Seu perfil social está desativado. Reative em Preferências para usar amigos e a busca."
        >
          <Button variant="secondary" onClick={() => navigate('/preferencias#perfil-social')}>
            Abrir Preferências
          </Button>
        </EmptyState>
      );
  }
}
