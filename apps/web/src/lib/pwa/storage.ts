/** Armazenamento persistente e uso de espaço (`navigator.storage`), tudo opcional e tolerante a falhas. */

export interface StorageStatus {
  /** `true` ativo, `false` não garantido, `null` o navegador não informa. */
  persisted: boolean | null;
  usageBytes: number | null;
  quotaBytes: number | null;
}

const UNITS = ['B', 'KB', 'MB', 'GB'] as const;

/** 1536 → "1,5 KB"; sem casas decimais em bytes. */
export function formatBytes(bytes: number): string {
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const text = unit === 0 ? String(Math.round(value)) : value.toFixed(1).replace('.', ',');
  return `${text.replace(/,0$/, '')} ${UNITS[unit]}`;
}

/** Pede ao navegador que não apague os dados do site sob pressão de espaço. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function readStorageStatus(): Promise<StorageStatus> {
  const status: StorageStatus = { persisted: null, usageBytes: null, quotaBytes: null };
  try {
    if (navigator.storage?.persisted) status.persisted = await navigator.storage.persisted();
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      status.usageBytes = estimate.usage ?? null;
      status.quotaBytes = estimate.quota ?? null;
    }
  } catch {
    // Sem informação: a tela mostra “não garantido”.
  }
  return status;
}
