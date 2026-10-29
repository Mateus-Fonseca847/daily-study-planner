import type { Subject } from '@daily/shared';

export const SUBJECTS: readonly Subject[] = [
  { id: 'mat', name: 'Matemática' },
  { id: 'fis', name: 'Física' },
  { id: 'qui', name: 'Química' },
  { id: 'bio', name: 'Biologia' },
  { id: 'his', name: 'História' },
  { id: 'red', name: 'Redação' },
];

export function subjectName(id: string): string {
  return SUBJECTS.find((s) => s.id === id)?.name ?? id;
}
