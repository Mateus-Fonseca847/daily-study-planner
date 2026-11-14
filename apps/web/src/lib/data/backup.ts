import { format } from 'date-fns';
import type { DataSnapshot } from '@daily/shared';
import { parseEnvelope, serializeEnvelope, type ParseResult } from './envelope';

export interface BackupFile {
  filename: string;
  content: string;
}

/**
 * Conteúdo e nome do arquivo de backup (mesmo formato salvo no navegador). `social` (opcional): o
 * perfil social e os aceites, num campo de topo FORA de `data` — a importação ignora esse campo,
 * então o formato v6 não muda. A foto não vai em binário (só a indicação de que existe).
 */
export function createBackupFile(
  snapshot: DataSnapshot,
  now: Date,
  social?: Record<string, unknown> | null,
): BackupFile {
  const content = serializeEnvelope(snapshot, now);
  return {
    filename: `daily-backup-${format(now, 'yyyy-MM-dd')}.json`,
    content: social
      ? JSON.stringify({ ...(JSON.parse(content) as object), social }, null, 2)
      : content,
  };
}

/** Valida um arquivo escolhido para importação (zod + migração). Nunca lança. */
export const readBackupFile = (text: string, now: Date = new Date()): ParseResult =>
  parseEnvelope(text, now);
