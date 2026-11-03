import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAuth } from '../lib/auth/auth-store';
import { markEntrySeen } from '../lib/auth/entry';

/** Entrada do app: Google para sincronizar, ou seguir como visitante (dados só neste navegador). */
export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth.status === 'signed-in' || auth.status === 'disabled') {
      navigate('/calendario', { replace: true });
    }
  }, [auth.status, navigate]);

  const google = async () => {
    setBusy(true);
    setError(null);
    markEntrySeen();
    const message = await auth.signInWithGoogle();
    // Sem erro, o navegador já está indo para o Google.
    if (message) {
      setError(message);
      setBusy(false);
    }
  };

  const guest = () => {
    markEntrySeen();
    navigate('/calendario');
  };

  return (
    <main className="grid min-h-full place-items-center bg-bg px-page py-8">
      <div className="flex w-full max-w-modal flex-col gap-6 rounded-xl border-hair bg-raised p-8">
        <div>
          <p className="text-logo font-bold tracking-tighter">
            Daily<span className="text-accent">.</span>
          </p>
          <h1 className="mt-4 text-xl font-semibold tracking-tighter">
            Entre para não perder seus estudos
          </h1>
          <p className="mt-2 text-md text-muted">
            Com uma conta, sua rotina fica salva na nuvem e acompanha você no computador e no
            celular. Sem conta, tudo funciona normalmente, mas fica só neste navegador.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button disabled={busy} onClick={() => void google()}>
            {busy ? 'Abrindo o Google…' : 'Entrar com Google'}
          </Button>
          <Button variant="secondary" onClick={guest}>
            Continuar sem conta
          </Button>
          {error && (
            <p role="alert" className="text-md text-danger">
              {error}
            </p>
          )}
        </div>

        <p className="text-sm text-muted">
          Usamos o Google só para identificar você (nome e e-mail). Não vemos sua senha e não
          compartilhamos seus dados. Leia a{' '}
          <Link to="/privacidade" className="underline">
            política de privacidade
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
