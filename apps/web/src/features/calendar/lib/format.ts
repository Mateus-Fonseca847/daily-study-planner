import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { StudyEvent } from '@daily/shared';

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const eventTime = (event: StudyEvent): string => format(parseISO(event.start), 'HH:mm');

export const eventTimeRange = (event: StudyEvent): string =>
  `${format(parseISO(event.start), 'HH:mm')} – ${format(parseISO(event.end), 'HH:mm')}`;

/** Ex.: “Quarta-feira, 3 de junho de 2026”. */
export const eventLongDate = (event: StudyEvent): string =>
  capitalize(format(parseISO(event.start), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }));

export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, month) => ({
  value: month,
  label: capitalize(format(new Date(2026, month, 1), 'LLLL', { locale: ptBR })),
}));
