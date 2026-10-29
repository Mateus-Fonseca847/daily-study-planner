import { format } from 'date-fns';
import type { DataSnapshot } from '@daily/shared';
import { parseEnvelope, serializeEnvelope, type ParseResult } from './envelope';

export interface BackupFile {
  filename: string;
  content: string;
}

/** Conteúdo e nome do arquivo de backup (mesmo formato salvo no navegador). */
export function createBackupFile(snapshot: DataSnapshot, now: Date): BackupFile {
  return {
    filename: `daily-backup-${format(now, 'yyyy-MM-dd')}.json`,
    content: serializeEnvelope(snapshot, now),
  };
}

/** Valida um arquivo escolhido para importação (zod + migração). Nunca lança. */
export const readBackupFile = (text: string): ParseResult => parseEnvelope(text);
