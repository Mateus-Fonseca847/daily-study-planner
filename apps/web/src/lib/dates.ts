import { format, parseISO } from 'date-fns';

/** ISO 8601 local (sem fuso), o formato guardado nos eventos. */
export const LOCAL_ISO = "yyyy-MM-dd'T'HH:mm:ss";

export const toLocalIso = (date: Date): string => format(date, LOCAL_ISO);
export const fromLocalIso = (iso: string): Date => parseISO(iso);
/** `yyyy-MM-dd`, a parte de data de um ISO local. */
export const dayOf = (iso: string): string => iso.slice(0, 10);
