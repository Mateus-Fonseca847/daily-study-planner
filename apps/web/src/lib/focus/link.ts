import {
  isExam,
  isOpen,
  isStudyBlock,
  type FocusLink,
  type StudyEvent,
  type Subject,
} from '@daily/shared';
import { toLocalIso } from '../dates';

/** Grupo de opções do seletor (compatível com `SelectGroup` da UI). */
export interface LinkGroup {
  label: string;
  options: { value: string; label: string }[];
}

/** Valor do `<select>` “Estudando”: `''` (livre), `s:ID` (matéria), `e:ID` (prova) ou `b:ID` (bloco). */
export function encodeLink(link: FocusLink): string {
  if (link.blockId) return `b:${link.blockId}`;
  if (link.examId) return `e:${link.examId}`;
  if (link.subjectId) return `s:${link.subjectId}`;
  return '';
}

export function decodeLink(value: string): FocusLink {
  const id = value.slice(2);
  const link: FocusLink = { subjectId: null, examId: null, blockId: null };
  if (!id) return link;
  if (value.startsWith('s:')) link.subjectId = id;
  if (value.startsWith('e:')) link.examId = id;
  if (value.startsWith('b:')) link.blockId = id;
  return link;
}

/** Opções do seletor: matérias, provas futuras e blocos de estudo de hoje (ainda abertos). */
export function buildLinkGroups(
  subjects: readonly Subject[],
  events: readonly StudyEvent[],
  now: Date,
): LinkGroup[] {
  const nowIso = toLocalIso(now);
  const today = nowIso.slice(0, 10);
  const groups: LinkGroup[] = [
    { label: 'Matérias', options: subjects.map((s) => ({ value: `s:${s.id}`, label: s.name })) },
    {
      label: 'Provas',
      options: events
        .filter(isExam)
        .filter((e) => isOpen(e) && e.end >= nowIso)
        .sort((a, b) => a.start.localeCompare(b.start))
        .map((e) => ({ value: `e:${e.id}`, label: e.title })),
    },
    {
      label: 'Blocos de estudo de hoje',
      options: events
        .filter(isStudyBlock)
        .filter((e) => isOpen(e) && e.start.slice(0, 10) === today)
        .sort((a, b) => a.start.localeCompare(b.start))
        .map((e) => ({ value: `b:${e.id}`, label: `${e.start.slice(11, 16)} · ${e.title}` })),
    },
  ];
  return groups.filter((g) => g.options.length > 0);
}

/** Texto do vínculo para o resumo (“Prova de Cálculo”), ou `null` se a sessão foi livre/o item sumiu. */
export function describeLink(
  link: FocusLink,
  subjects: readonly Subject[],
  events: readonly StudyEvent[],
): string | null {
  const title = (id: string | null) => events.find((e) => e.id === id)?.title;
  if (link.blockId) return title(link.blockId) ? `Bloco: ${title(link.blockId)}` : null;
  if (link.examId) return title(link.examId) ? `Prova: ${title(link.examId)}` : null;
  if (link.subjectId) return subjects.find((s) => s.id === link.subjectId)?.name ?? null;
  return null;
}
