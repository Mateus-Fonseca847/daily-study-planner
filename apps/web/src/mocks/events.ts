import {
  addMinutes,
  addMonths,
  endOfMonth,
  format,
  setHours,
  setMinutes,
  startOfMonth,
} from 'date-fns';
import {
  createInitialSnapshot,
  studyEventSchema,
  type DataSnapshot,
  type EventType,
  type StudyEvent,
} from '@daily/shared';
import { toLocalIso } from '../lib/dates';
import { SUBJECTS } from './subjects';

interface Template {
  day: number;
  time: string;
  minutes: number;
  type: EventType;
  title: string;
  subjectId: string;
  /** Conteúdos da prova (3 a 6) e quantos já estão concluídos. */
  contents?: readonly string[];
  doneCount?: number;
}

/** Modelo do mês: repetido (com datas relativas) para o mês visível e vizinhos. */
const TEMPLATES: readonly Template[] = [
  {
    day: 1,
    time: '14:00',
    minutes: 90,
    type: 'estudo',
    title: 'Lista de exercícios',
    subjectId: 'mat',
  },
  {
    day: 2,
    time: '19:00',
    minutes: 60,
    type: 'revisao',
    title: 'Revisão de Cinemática',
    subjectId: 'fis',
  },
  {
    day: 3,
    time: '08:00',
    minutes: 120,
    type: 'prova',
    title: 'Prova de Cálculo II',
    subjectId: 'mat',
    contents: ['Limites', 'Derivadas', 'Regra da cadeia', 'Integrais', 'Aplicações'],
    doneCount: 2,
  },
  {
    day: 3,
    time: '14:00',
    minutes: 90,
    type: 'estudo',
    title: 'Leitura: capítulo 4',
    subjectId: 'bio',
  },
  {
    day: 3,
    time: '17:00',
    minutes: 30,
    type: 'entrega',
    title: 'Relatório de laboratório',
    subjectId: 'qui',
  },
  {
    day: 3,
    time: '20:00',
    minutes: 45,
    type: 'revisao',
    title: 'Flashcards de Genética',
    subjectId: 'bio',
  },
  {
    day: 6,
    time: '18:00',
    minutes: 30,
    type: 'entrega',
    title: 'Redação: tema livre',
    subjectId: 'red',
  },
  {
    day: 8,
    time: '15:00',
    minutes: 120,
    type: 'estudo',
    title: 'Grupo de estudos',
    subjectId: 'his',
  },
  {
    day: 9,
    time: '08:30',
    minutes: 300,
    type: 'especial',
    title: 'Simulado ENEM',
    subjectId: 'red',
  },
  {
    day: 11,
    time: '10:00',
    minutes: 120,
    type: 'prova',
    title: 'Prova de Mecânica',
    subjectId: 'fis',
    contents: [
      'Leis de Newton',
      'Trabalho e energia',
      'Impulso',
      'Colisões',
      'Gravitação',
      'Estática',
    ],
    doneCount: 4,
  },
  {
    day: 11,
    time: '15:00',
    minutes: 90,
    type: 'estudo',
    title: 'Exercícios de Dinâmica',
    subjectId: 'fis',
  },
  {
    day: 13,
    time: '18:00',
    minutes: 60,
    type: 'revisao',
    title: 'Revisão de Estequiometria',
    subjectId: 'qui',
  },
  {
    day: 14,
    time: '09:30',
    minutes: 90,
    type: 'prova',
    title: 'Prova de Química Orgânica',
    subjectId: 'qui',
    contents: ['Funções orgânicas', 'Isomeria', 'Reações de adição'],
    doneCount: 0,
  },
  { day: 14, time: '14:00', minutes: 60, type: 'estudo', title: 'Mapa mental', subjectId: 'qui' },
  {
    day: 14,
    time: '19:00',
    minutes: 45,
    type: 'revisao',
    title: 'Resumo de Orgânica',
    subjectId: 'qui',
  },
  {
    day: 17,
    time: '17:00',
    minutes: 30,
    type: 'entrega',
    title: 'Trabalho de História',
    subjectId: 'his',
  },
  {
    day: 19,
    time: '16:00',
    minutes: 90,
    type: 'estudo',
    title: 'Fichamento do livro',
    subjectId: 'his',
  },
  {
    day: 20,
    time: '10:00',
    minutes: 90,
    type: 'prova',
    title: 'Prova de Citologia',
    subjectId: 'bio',
    contents: ['Membrana plasmática', 'Organelas', 'Divisão celular', 'Metabolismo energético'],
    doneCount: 1,
  },
  {
    day: 20,
    time: '19:30',
    minutes: 60,
    type: 'revisao',
    title: 'Revisão de Citologia',
    subjectId: 'bio',
  },
  {
    day: 22,
    time: '09:00',
    minutes: 240,
    type: 'especial',
    title: 'Feira de Ciências',
    subjectId: 'fis',
  },
  {
    day: 24,
    time: '08:00',
    minutes: 120,
    type: 'prova',
    title: 'Prova de História Moderna',
    subjectId: 'his',
    contents: ['Renascimento', 'Reforma', 'Absolutismo', 'Iluminismo', 'Revoluções'],
    doneCount: 3,
  },
  {
    day: 24,
    time: '13:00',
    minutes: 60,
    type: 'estudo',
    title: 'Linha do tempo',
    subjectId: 'his',
  },
  {
    day: 24,
    time: '18:00',
    minutes: 30,
    type: 'entrega',
    title: 'Questionário online',
    subjectId: 'mat',
  },
  {
    day: 27,
    time: '19:00',
    minutes: 60,
    type: 'revisao',
    title: 'Revisão geral',
    subjectId: 'mat',
  },
  {
    day: 28,
    time: '15:00',
    minutes: 120,
    type: 'estudo',
    title: 'Banco de questões',
    subjectId: 'red',
  },
];

function statusAt(start: Date, end: Date, now: Date): StudyEvent['status'] {
  if (end < now) return 'concluido';
  if (start <= now) return 'em-andamento';
  return 'pendente';
}

function buildMonth(month: Date, now: Date): StudyEvent[] {
  const key = format(month, 'yyyy-MM');
  const lastDay = endOfMonth(month).getDate();
  return TEMPLATES.map((t, index) => {
    const [h = 0, m = 0] = t.time.split(':').map(Number);
    const day = new Date(startOfMonth(month));
    day.setDate(Math.min(t.day, lastDay));
    const start = setMinutes(setHours(day, h), m);
    const end = addMinutes(start, t.minutes);
    const past = end < now;
    return studyEventSchema.parse({
      id: `${key}-${index}`,
      title: t.title,
      type: t.type,
      status: statusAt(start, end, now),
      subjectId: t.subjectId,
      start: toLocalIso(start),
      end: toLocalIso(end),
      notes: '',
      ...(t.type === 'prova'
        ? {
            contents: (t.contents ?? []).map((title, i) => ({
              id: `${key}-${index}-c${i}`,
              title,
              done: past || i < (t.doneCount ?? 0),
              order: i,
            })),
          }
        : {}),
    });
  });
}

/** Eventos do mês informado e dos vizinhos, com datas relativas a `now`. */
export function buildEvents(month: Date, now: Date = new Date()): StudyEvent[] {
  return [-1, 0, 1].flatMap((offset) => buildMonth(addMonths(month, offset), now));
}

/** Dados de exemplo (botão “Carregar dados de exemplo”). */
export function sampleSnapshot(now: Date = new Date()): DataSnapshot {
  return {
    ...createInitialSnapshot(toLocalIso(now)),
    subjects: [...SUBJECTS],
    events: buildEvents(now, now),
  };
}
