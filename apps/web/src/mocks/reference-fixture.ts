import { addMinutes, format, setHours, setMinutes } from 'date-fns';
import { studyEventSchema, type EventType, type StudyEvent } from '@daily/shared';
import { REFERENCE_NOW } from '../lib/fixture';

const LOCAL_ISO = "yyyy-MM-dd'T'HH:mm:ss";

interface Row {
  day: number;
  time: string;
  type: EventType;
  title: string;
  subjectId: string;
  contents?: readonly string[];
  doneCount?: number;
}

/** Densidade da referência (novembro/2024): dias com 1 e 2 chips, um dia com “+2 mais”, todos os tipos. */
const ROWS: readonly Row[] = [
  { day: 1, time: '09:30', type: 'estudo', title: 'Lista de exercícios', subjectId: 'mat' },
  { day: 2, time: '09:30', type: 'revisao', title: 'Revisão de Cinemática', subjectId: 'fis' },
  { day: 4, time: '09:30', type: 'revisao', title: 'Flashcards de Genética', subjectId: 'bio' },
  { day: 4, time: '10:30', type: 'estudo', title: 'Leitura: capítulo 4', subjectId: 'bio' },
  { day: 5, time: '09:30', type: 'especial', title: 'Simulado ENEM', subjectId: 'red' },
  { day: 8, time: '09:30', type: 'especial', title: 'Feira de Ciências', subjectId: 'fis' },
  {
    day: 13,
    time: '09:30',
    type: 'prova',
    title: 'Prova de Cálculo II',
    subjectId: 'mat',
    contents: ['Limites', 'Derivadas', 'Regra da cadeia', 'Integrais', 'Aplicações'],
    doneCount: 2,
  },
  { day: 19, time: '09:30', type: 'estudo', title: 'Grupo de estudos', subjectId: 'his' },
  { day: 21, time: '09:30', type: 'estudo', title: 'Exercícios de Dinâmica', subjectId: 'fis' },
  {
    day: 21,
    time: '10:30',
    type: 'prova',
    title: 'Prova de Mecânica',
    subjectId: 'fis',
    contents: ['Leis de Newton', 'Trabalho e energia', 'Impulso'],
    doneCount: 0,
  },
  { day: 23, time: '09:30', type: 'entrega', title: 'Relatório de laboratório', subjectId: 'qui' },
  { day: 23, time: '10:30', type: 'revisao', title: 'Revisão de Estequiometria', subjectId: 'qui' },
  { day: 23, time: '12:30', type: 'estudo', title: 'Mapa mental', subjectId: 'qui' },
  { day: 23, time: '14:30', type: 'especial', title: 'Plantão de dúvidas', subjectId: 'mat' },
  { day: 25, time: '09:30', type: 'entrega', title: 'Trabalho de História', subjectId: 'his' },
  { day: 27, time: '09:30', type: 'revisao', title: 'Revisão geral', subjectId: 'mat' },
  { day: 29, time: '09:30', type: 'especial', title: 'Simulado de redação', subjectId: 'red' },
];

export function referenceEvents(): StudyEvent[] {
  return ROWS.map((row, index) => {
    const [h = 0, m = 0] = row.time.split(':').map(Number);
    const start = setMinutes(setHours(new Date(2024, 10, row.day), h), m);
    const end = addMinutes(start, 60);
    return studyEventSchema.parse({
      id: `ref-${index}`,
      title: row.title,
      type: row.type,
      status: end < REFERENCE_NOW ? 'concluida' : 'agendada',
      subjectId: row.subjectId,
      start: format(start, LOCAL_ISO),
      end: format(end, LOCAL_ISO),
      contents: (row.contents ?? []).map((title, i) => ({
        id: `ref-${index}-c${i}`,
        title,
        done: i < (row.doneCount ?? 0),
      })),
    });
  });
}
