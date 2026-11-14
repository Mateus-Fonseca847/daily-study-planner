import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/auth/auth-store';
import { useSocial } from '../../lib/social/social-store';
import { Button } from '../../components/ui/Button';
import { ActivationWizard } from './ActivationWizard';
import { ManageSocialProfile } from './ManageSocialProfile';

/**
 * Preferências → Perfil social. Só aqui (e ao abrir o assistente) o app fala com o servidor sobre o
 * social: quem nunca abre esta seção não faz nenhuma requisição nova. Sem conta: convite para
 * entrar. Sem as tabelas no banco: “ainda não disponível”, sem afetar o resto.
 */
export function SocialSection() {
  const auth = useAuth();
  const phase = useSocial((s) => s.phase);
  const profile = useSocial((s) => s.profile);
  const error = useSocial((s) => s.error);
  const load = useSocial((s) => s.load);
  const [wizard, setWizard] = useState(false);
  const navigate = useNavigate();
  const { hash } = useLocation();
  const ref = useRef<HTMLElement>(null);
  const signedIn = auth.status === 'signed-in';

  useEffect(() => {
    if (signedIn) void load();
  }, [signedIn, load]);

  useEffect(() => {
    if (hash === '#perfil-social') ref.current?.scrollIntoView({ block: 'start' });
  }, [hash]);

  // Sem nuvem configurada (build local), o social não existe.
  if (auth.status === 'disabled' || auth.status === 'loading') return null;

  return (
    <section
      ref={ref}
      id="perfil-social"
      aria-labelledby="perfil-social-title"
      className="flex scroll-mt-4 flex-col gap-4 rounded-xl border-hair p-6 phone:p-4"
    >
      <h2 id="perfil-social-title" className="text-lg font-semibold tracking-tight">
        Perfil social
      </h2>

      {!signedIn ? (
        <>
          <p className="text-md text-soft">
            O perfil social (com @ e foto, e em breve amigos) precisa de uma conta. Entre com sua
            conta Google para ativar.
          </p>
          <div>
            <Button onClick={() => navigate('/entrar')}>Entrar com Google</Button>
          </div>
        </>
      ) : phase === 'idle' || phase === 'loading' ? (
        <p className="inline-flex items-center gap-2 text-md text-muted" role="status">
          <Loader2 aria-hidden strokeWidth={1.5} className="size-icon motion-safe:animate-spin" />
          Carregando…
        </p>
      ) : phase === 'indisponivel' ? (
        <p className="text-md text-soft">{error?.message}</p>
      ) : phase === 'erro' ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-md text-soft">{error?.message}</p>
          <Button variant="secondary" onClick={() => void load()}>
            Tentar de novo
          </Button>
        </div>
      ) : profile ? (
        <ManageSocialProfile profile={profile} />
      ) : (
        <>
          <p className="text-md text-soft">
            Crie um perfil com @, nome e foto. Por enquanto, só você vê o seu perfil; amigos chegam
            numa próxima versão. Disponível a partir dos 14 anos.
          </p>
          <div>
            <Button onClick={() => setWizard(true)}>Ativar perfil social</Button>
          </div>
        </>
      )}

      {wizard && signedIn && (
        <ActivationWizard defaultName={auth.user.name} onClose={() => setWizard(false)} />
      )}
    </section>
  );
}
