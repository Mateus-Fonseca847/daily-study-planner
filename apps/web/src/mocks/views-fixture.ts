import { dataSnapshotSchema, studyEventSchema, type DataSnapshot } from '@daily/shared';
import { dayKey, shiftDay } from '../lib/dates';
import { VIEWS_NOW } from '../lib/fixture';
import { statsSnapshot } from './stats-fixture';

const pad = (n: number) => String(n).padStart(2, '0');
const at = (day: string, hour: number, minute = 0) => `${day}T${pad(hour)}:${pad(minute)}:00`;

/**
 * Fixture `?fixture=views` (quinta-feira, 29/10/2026, 10h30): a base das Estatísticas (4 hábitos com
 * e sem horário e ~150 dias de histórico) mais uma semana densa de eventos — três simultâneos,
 * encadeados, uma prova, um evento que cruza a meia-noite, um fora do intervalo 06h–24h e dias vazios.
 */
export function viewsSnapshot(now: Date = VIEWS_NOW): DataSnapshot {
  const base = statsSnapshot(now);
  const today = dayKey(now);
  const week = (offset: number) => shiftDay(today, offset); // hoje = quinta (+0); domingo = −4

  const extra: [string, number, string, number, number, number, number, string, string, string][] =
    [
      // [id, dia, tipo, hora início, min início, hora fim, min fim, título, status, matéria]
      ['a', -3, 'estudo', 9, 0, 10, 30, 'Lista de derivadas', 'concluido', 'mat'],
      ['b', -3, 'revisao', 14, 0, 15, 0, 'Revisão de Física', 'concluido', 'fis'],
      // Terça: três simultâneos e um encadeado.
      ['c', -2, 'estudo', 9, 0, 11, 0, 'Resolução de exercícios', 'concluido', 'mat'],
      ['d', -2, 'revisao', 9, 30, 10, 30, 'Revisar fichamento', 'concluido', 'his'],
      ['e', -2, 'estudo', 10, 0, 12, 0, 'Laboratório de química', 'concluido', 'qui'],
      ['f', -2, 'estudo', 11, 30, 12, 30, 'Leitura de biologia', 'pendente', 'bio'],
      ['g', -2, 'entrega', 18, 0, 18, 0, 'Entregar relatório', 'pendente', 'qui'],
      // Quarta: prova e um evento que cruza a meia-noite.
      ['h', -1, 'prova', 8, 0, 10, 0, 'Prova de Física', 'pendente', 'fis'],
      ['i', -1, 'estudo', 10, 30, 12, 0, 'Correção da prova', 'pendente', 'fis'],
      ['j', -1, 'especial', 22, 0, 25, 30, 'Maratona de redação', 'pendente', 'red'],
      // Hoje: simultâneos à tarde (os das 10h e 11h vêm da base).
      ['k', 0, 'estudo', 15, 0, 16, 0, 'Grupo de estudos', 'pendente', 'mat'],
      ['l', 0, 'revisao', 15, 0, 16, 0, 'Revisão de História', 'pendente', 'his'],
      ['m', 0, 'estudo', 15, 30, 17, 0, 'Simulado', 'pendente', 'bio'],
      // Sexta: fora do intervalo padrão (05h) e uma entrega no fim do dia.
      ['n', 1, 'estudo', 5, 0, 6, 30, 'Estudo antes do trabalho', 'pendente', 'mat'],
      ['o', 1, 'entrega', 23, 59, 23, 59, 'Entregar redação', 'pendente', 'red'],
    ];
  const events = extra.map(([id, offset, type, sh, sm, eh, em, title, status, subjectId]) => {
    const day = week(offset);
    const crosses = eh >= 24;
    return studyEventSchema.parse({
      id: `fx-v-${id}`,
      type,
      title,
      subjectId,
      status,
      notes: '',
      start: at(day, sh, sm),
      end: crosses ? at(shiftDay(day, 1), eh - 24, em) : at(day, eh, em),
      ...(type === 'prova' ? { contents: [] } : {}),
    });
  });
  return dataSnapshotSchema.parse({ ...base, events: [...base.events, ...events] });
}
