import type { ActiveFocus } from '@daily/shared';
import { emAndamento } from '../focus/session';

/**
 * A oferta “Nova versão disponível” nunca aparece durante uma sessão de foco rodando, pausada ou
 * travada (a trava só existe com sessão em andamento): recarregar a página a interromperia.
 * Ela é oferecida quando a sessão termina.
 */
export function canOfferUpdate(active: ActiveFocus | null): boolean {
  return !emAndamento(active);
}
