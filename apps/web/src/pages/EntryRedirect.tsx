import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth/auth-store';
import { hasSeenEntry } from '../lib/auth/entry';

const CALENDAR = '/calendario';

/** Rota “/”: na primeira visita (com nuvem ligada e sem sessão) mostra a entrada; senão, o calendário. */
export function EntryRedirect() {
  const status = useAuth((s) => s.status);
  if (status === 'loading') return null;
  if (status === 'visitor' && !hasSeenEntry()) return <Navigate to="/entrar" replace />;
  return <Navigate to={CALENDAR} replace />;
}
