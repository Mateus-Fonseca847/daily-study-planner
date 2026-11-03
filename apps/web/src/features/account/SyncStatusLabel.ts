import type { Phase } from '../../lib/sync/engine';

export const PHASE_LABEL: Record<Phase, string> = {
  off: '',
  syncing: 'Sincronizando…',
  synced: 'Sincronizado',
  pending: 'Alterações pendentes',
  offline: 'Offline — envia ao voltar',
  error: 'Erro ao sincronizar',
  conflict: 'Conflito de dados',
  outdated: 'Atualize o app',
};
