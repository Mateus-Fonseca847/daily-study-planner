import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAchievementsUi } from '../../../lib/achievements/ui-store';

/**
 * Atende o “Ver” dos avisos de medalha fora do Perfil: leva até lá (a seção Conquistas abre a
 * medalha e limpa o pedido). Não renderiza nada.
 */
export function AchievementsNavigator() {
  const request = useAchievementsUi((s) => s.request);
  const navigate = useNavigate();
  const onProfile = useLocation().pathname === '/perfil';
  useEffect(() => {
    if (request && !onProfile) navigate('/perfil');
  }, [request, onProfile, navigate]);
  return null;
}
