import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialSnapshot, type DataSnapshot, type StudyEvent } from '@daily/shared';
import { createDataStore } from '../data/store';
import { memoryRepo } from '../data/test-utils';
import { useToasts } from '../toast-store';
import { createAchievementsRunner, EVALUATE_DEBOUNCE_MS, noticeFor } from './runner';
import { useAchievementsUi } from './ui-store';

const NOW = new Date('2026-11-10T10:30:00');
const useData = createDataStore(memoryRepo().repo);
let seq = 0;
const done = (day: string, over: Partial<StudyEvent> = {}): StudyEvent => {
  seq += 1;
  return {
    id: `t${seq}`,
    type: 'tarefa',
    title: `T${seq}`,
    start: `${day}T09:00:00`,
    end: `${day}T10:00:00`,
    subjectId: null,
    status: 'concluido',
    notes: '',
    subtasks: [],
    createdAt: `${day}T08:00:00`,
    ...over,
  };
};
const load = (patch: Partial<DataSnapshot>, seededAt: string | null = '2026-01-01T00:00:00') =>
  useData.getState().replaceAll({
    ...createInitialSnapshot(),
    onboarding: { waterHabitCreated: true, achievementsSeededAt: seededAt },
    ...patch,
  });
const messages = () => useToasts.getState().toasts.map((t) => t.message);
const settle = () => vi.advanceTimersByTime(EVALUATE_DEBOUNCE_MS + 10);

describe('avaliação no app (runner)', () => {
  let stop: () => void;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    useToasts.setState({ toasts: [] });
    load({});
    stop = createAchievementsRunner(useData, { now: () => new Date() });
    settle();
    useToasts.setState({ toasts: [] });
  });
  afterEach(() => {
    stop();
    useData.getState().setFocusActive(null);
    vi.useRealTimers();
  });

  it('concessão retroativa: grava tudo de uma vez e mostra um único resumo', () => {
    load(
      {
        events: Array.from({ length: 12 }, (_, i) =>
          done(`2026-06-${String(i + 1).padStart(2, '0')}`),
        ),
      },
      null,
    );
    settle();
    const state = useData.getState();
    expect(state.onboarding.achievementsSeededAt).toMatch(/^2026-11-10T10:30/);
    expect(state.achievements.map((a) => a.id).sort()).toEqual([
      'dia-limpo',
      'maos-a-obra',
      'primeiro-passo',
    ]);
    expect(state.achievements.find((a) => a.id === 'primeiro-passo')!.levels).toEqual([
      '2026-06-01T12:00:00',
    ]);
    expect(messages()).toEqual(['Você já conquistou 3 medalhas']);
  });

  it('sem histórico: a concessão retroativa não avisa nada', () => {
    load({}, null);
    settle();
    expect(useData.getState().onboarding.achievementsSeededAt).not.toBeNull();
    expect(messages()).toEqual([]);
  });

  it('concluir a primeira tarefa: aviso com “Primeiro passo” (e o dia limpo), num aviso só', () => {
    load({ events: [done('2026-11-09', { status: 'pendente', id: 'a' })] });
    settle();
    expect(messages()).toEqual([]);
    useData.getState().setEventStatus('a', 'concluido');
    settle();
    expect(messages()).toEqual(['2 novas medalhas: Primeiro passo, Dia limpo — bronze']);
    useToasts.getState().toasts[0]!.onAction!();
    expect(useAchievementsUi.getState().request).toEqual({ id: null });
  });

  it('uma medalha só: “Nova medalha: Rotina”, e “Ver” abre o detalhe dela', () => {
    load({});
    settle();
    load({
      events: [
        done('2026-11-12', {
          status: 'pendente',
          recurrence: { freq: 'diaria', interval: 1, end: { kind: 'nunca' } },
        }),
      ],
    });
    settle();
    expect(messages()).toEqual(['Nova medalha: Rotina']);
    useToasts.getState().toasts[0]!.onAction!();
    expect(useAchievementsUi.getState().request).toEqual({ id: 'rotina' });
  });

  it('várias conquistas ao mesmo tempo viram um aviso só', () => {
    const recurring = done('2026-11-09', {
      status: 'pendente',
      recurrence: { freq: 'diaria', interval: 1, end: { kind: 'nunca' } },
    });
    load({ events: [done('2026-11-09'), recurring] });
    settle();
    expect(messages()).toHaveLength(1);
    expect(messages()[0]).toMatch(/^\d novas medalhas: /);
    expect(messages()[0]).toContain('Rotina');
  });

  it('com o Modo Foco rodando, o aviso espera a sessão acabar', () => {
    load({});
    settle();
    useData.getState().setFocusActive({
      id: 'f',
      status: 'rodando',
      durationSec: 1500,
      startedAtMs: NOW.getTime(),
      endsAtMs: NOW.getTime() + 1_500_000,
      remainingMs: null,
      locked: false,
      link: { subjectId: null, examId: null },
      tabId: 'aba',
    });
    expect(useData.getState().focusActive?.status).toBe('rodando');
    load({ events: [done('2026-11-09')] });
    settle();
    expect(useData.getState().achievements.map((a) => a.id)).toContain('primeiro-passo');
    expect(messages()).toEqual([]);
    useData.getState().setFocusActive(null);
    expect(messages()).toEqual(['2 novas medalhas: Primeiro passo, Dia limpo — bronze']);
  });

  it('idempotente: mudança sem conquista nova não avisa de novo', () => {
    load({ events: [done('2026-11-09')] });
    settle();
    useToasts.setState({ toasts: [] });
    useData.getState().updatePreferences({ name: 'Ana' });
    useData.getState().addWater(NOW);
    settle();
    expect(messages()).toEqual([]);
  });

  it('texto do aviso: nível em minúsculas; nível único só com o título', () => {
    expect(noticeFor([{ id: 'constancia', level: 2 }])).toBe('Nova medalha: Constância — prata');
    expect(
      noticeFor([
        { id: 'primeiro-passo', level: 1 },
        { id: 'rotina', level: 1 },
      ]),
    ).toBe('2 novas medalhas: Primeiro passo, Rotina');
  });
});
