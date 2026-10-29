import { z } from 'zod';

/** Data local `yyyy-MM-dd` (nunca UTC). */
export const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.');
export const localDateTimeSchema = z.iso.datetime({ local: true });
