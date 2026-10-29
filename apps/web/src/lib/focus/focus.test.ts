import { describe, expect, it } from 'vitest';
import { HOLD_TO_UNLOCK_MS, MIN_SAVED_SESSION_SEC } from './constants';
import { angleForMinutes, minutesFromKey, minutesFromPointer } from './dial';
import { describeMinutes, formatClock, formatFocused, sessionTitle } from './format';
import { holdProgress } from './hold';
import {
  adjustMinutes,
  clampMinutes,
  createIdleSession,
  decorridoSec,
  emAndamento,
  encerrar,
  finalizar,
  fracaoRestante,
  iniciar,
  pausar,
  reiniciar,
  restanteMs,
  restaurar,
  retomar,
  terminou,
  travado,
} from './session';

const T0 = new Date(2026, 10, 10, 14, 0, 0).getTime(); // 10/11/2026 14:00:00 (local)
const MIN = 60_000;

const idle = (minutes = 25, extra = {}) =>
  createIdleSession({ id: 's1', minutes, tabId: 'tab-1', ...extra });

describe('máquina de estados do cronômetro', () => {
  it('ocioso mostra a duração inteira e iniciar calcula o fim por timestamp', () => {
    const s = idle(25);
    expect(s.status).toBe('ocioso');
    expect(restanteMs(s, T0)).toBe(25 * MIN);

    const running = iniciar(s, T0);
    expect(running).toMatchObject({ status: 'rodando', startedAtMs: T0, endsAtMs: T0 + 25 * MIN });
    expect(restanteMs(running, T0 + 10 * MIN)).toBe(15 * MIN);
  });

  it('o restante vem de fimEm − agora: não depende de quantos ticks aconteceram', () => {
    const running = iniciar(idle(25), T0);
    // Aba em segundo plano: nenhum tick por 7 minutos e o valor continua exato.
    expect(restanteMs(running, T0 + 7 * MIN + 123)).toBe(18 * MIN - 123);
    expect(fracaoRestante(running, T0 + 5 * MIN)).toBeCloseTo(0.8);
  });

  it('pausar congela o restante; retomar recalcula o fim a partir de agora', () => {
    const running = iniciar(idle(25), T0);
    const paused = pausar(running, T0 + 10 * MIN);
    expect(paused).toMatchObject({ status: 'pausado', remainingMs: 15 * MIN, endsAtMs: null });
    // Passa muito tempo pausado: nada muda.
    expect(restanteMs(paused, T0 + 999 * MIN)).toBe(15 * MIN);

    const resumed = retomar(paused, T0 + 30 * MIN);
    expect(resumed).toMatchObject({
      status: 'rodando',
      endsAtMs: T0 + 45 * MIN,
      remainingMs: null,
    });
  });

  it('transições inválidas não fazem nada', () => {
    const s = idle();
    expect(pausar(s, T0)).toBe(s);
    expect(retomar(s, T0)).toBe(s);
    const running = iniciar(s, T0);
    expect(iniciar(running, T0 + 1)).toBe(running);
    expect(retomar(running, T0 + 1)).toBe(running);
  });

  it('reiniciar volta ao tempo escolhido, parado, mantendo vínculo e trava', () => {
    const link = { subjectId: 'mat', examId: null, blockId: 'b1' };
    const running = pausar(iniciar(idle(40, { locked: true, link }), T0), T0 + 5 * MIN);
    const reset = reiniciar(running);
    expect(reset).toMatchObject({ status: 'ocioso', durationSec: 40 * 60, locked: true, link });
    expect(restanteMs(reset, T0)).toBe(40 * MIN);
    expect(reset.endsAtMs).toBeNull();
  });

  it('terminou só vale quando rodando e o tempo acabou; o restante nunca fica negativo', () => {
    const running = iniciar(idle(1), T0);
    expect(terminou(running, T0 + MIN - 1)).toBe(false);
    expect(terminou(running, T0 + MIN)).toBe(true);
    expect(restanteMs(running, T0 + 99 * MIN)).toBe(0);
    expect(terminou(pausar(running, T0 + 10), T0 + 99 * MIN)).toBe(false);
  });

  it('decorrido não conta a pausa', () => {
    const s = retomar(pausar(iniciar(idle(25), T0), T0 + 10 * MIN), T0 + 60 * MIN);
    expect(decorridoSec(s, T0 + 65 * MIN)).toBe(15 * 60); // 10 min antes + 5 min depois
  });

  it('travado = trava ligada E sessão rodando ou pausada', () => {
    const locked = idle(25, { locked: true });
    expect(travado(locked)).toBe(false); // ocioso
    expect(travado(iniciar(locked, T0))).toBe(true);
    expect(travado(pausar(iniciar(locked, T0), T0 + 1))).toBe(true);
    expect(travado(iniciar(idle(25), T0))).toBe(false); // sem trava
    expect(travado(null)).toBe(false);
    expect(emAndamento(null)).toBe(false);
  });
});

describe('finalizar e encerrar', () => {
  it('finalizar salva como concluída com a duração planejada e o vínculo', () => {
    const link = { subjectId: 'mat', examId: 'e1', blockId: null };
    const record = finalizar(iniciar(idle(25, { link }), T0));
    expect(record).toEqual({
      id: 's1',
      startedAt: '2026-11-10T14:00:00',
      plannedSec: 1500,
      actualSec: 1500,
      status: 'concluida',
      subjectId: 'mat',
      examId: 'e1',
      blockId: null,
    });
  });

  it('encerrar após mais de 1 minuto salva como interrompida com o tempo real', () => {
    const running = iniciar(idle(25), T0);
    const record = encerrar(running, T0 + 7 * MIN + 30_000);
    expect(record).toMatchObject({ status: 'interrompida', plannedSec: 1500, actualSec: 450 });
  });

  it('encerrar com 1 minuto ou menos descarta a sessão', () => {
    const running = iniciar(idle(25), T0);
    expect(MIN_SAVED_SESSION_SEC).toBe(60);
    expect(encerrar(running, T0 + 59_000)).toBeNull();
    expect(encerrar(running, T0 + 60_000)).toBeNull(); // exatamente 1 min: ainda não “passou”
    expect(encerrar(running, T0 + 61_000)?.actualSec).toBe(61);
  });

  it('encerrar pausada usa o tempo já focado', () => {
    const paused = pausar(iniciar(idle(25), T0), T0 + 10 * MIN);
    expect(encerrar(paused, T0 + 500 * MIN)?.actualSec).toBe(600);
  });

  it('encerrar uma sessão ociosa não gera nada', () => {
    expect(encerrar(idle(), T0)).toBeNull();
  });
});

describe('restauração após recarregar', () => {
  it('rodando com fim já passado → finaliza como concluída', () => {
    const running = iniciar(idle(25), T0);
    const { active, finished } = restaurar(running, T0 + 26 * MIN);
    expect(active).toBeNull();
    expect(finished).toMatchObject({ status: 'concluida', actualSec: 1500, id: 's1' });
  });

  it('rodando e ainda dentro do prazo → continua de onde estava', () => {
    const running = iniciar(idle(25), T0);
    const { active, finished } = restaurar(running, T0 + 10 * MIN);
    expect(finished).toBeNull();
    expect(active && restanteMs(active, T0 + 10 * MIN)).toBe(15 * MIN);
  });

  it('pausada → mantém o restante, não importa quanto tempo passou', () => {
    const paused = pausar(iniciar(idle(25), T0), T0 + 10 * MIN);
    const { active, finished } = restaurar(paused, T0 + 24 * 60 * MIN);
    expect(finished).toBeNull();
    expect(active && restanteMs(active, T0 + 24 * 60 * MIN)).toBe(15 * MIN);
  });

  it('exatamente no instante do fim também conta como concluída', () => {
    expect(restaurar(iniciar(idle(1), T0), T0 + MIN).finished?.status).toBe('concluida');
  });

  it('sem sessão ou ociosa → nada a restaurar', () => {
    expect(restaurar(null, T0)).toEqual({ active: null, finished: null });
    expect(restaurar(idle(), T0)).toEqual({ active: null, finished: null });
  });
});

describe('ajuste de tempo', () => {
  it('limita a 1–180 minutos', () => {
    expect(clampMinutes(0)).toBe(1);
    expect(clampMinutes(-10)).toBe(1);
    expect(clampMinutes(181)).toBe(180);
    expect(clampMinutes(25.4)).toBe(25);
    expect(idle(500).durationSec).toBe(180 * 60);
    expect(idle(0).durationSec).toBe(60);
  });

  it('passos de 1 min (teclado) e ±5 min (botões) respeitam os limites', () => {
    expect(adjustMinutes(25, 1)).toBe(26);
    expect(adjustMinutes(25, -5)).toBe(20);
    expect(adjustMinutes(3, -5)).toBe(1);
    expect(adjustMinutes(178, 5)).toBe(180);
  });

  it('teclado: setas ±1, PageUp/PageDown ±5, Home/End nas pontas, outras teclas ignoradas', () => {
    expect(minutesFromKey('ArrowRight', 25)).toBe(26);
    expect(minutesFromKey('ArrowUp', 25)).toBe(26);
    expect(minutesFromKey('ArrowLeft', 25)).toBe(24);
    expect(minutesFromKey('ArrowDown', 1)).toBe(1);
    expect(minutesFromKey('PageUp', 25)).toBe(30);
    expect(minutesFromKey('PageDown', 25)).toBe(20);
    expect(minutesFromKey('Home', 25)).toBe(1);
    expect(minutesFromKey('End', 25)).toBe(180);
    expect(minutesFromKey('a', 25)).toBeNull();
  });
});

describe('arrastar o anel', () => {
  const center = { x: 100, y: 100 };
  it('converte o ângulo do ponteiro em minutos (volta inteira = 180)', () => {
    expect(minutesFromPointer(center, { x: 200, y: 100 }, 30)).toBe(45); // 3 h → 90° → 45 min
    expect(minutesFromPointer(center, { x: 100, y: 200 }, 80)).toBe(90); // 180°
    expect(minutesFromPointer(center, { x: 0, y: 100 }, 120)).toBe(135); // 270°
    expect(angleForMinutes(90)).toBe(180);
  });

  it('não salta de 180 para 1 ao cruzar o topo: gruda na ponta', () => {
    // Estava em 175 e o ponteiro passa um pouco da direita do topo (≈ 1 min).
    expect(minutesFromPointer(center, { x: 101, y: 0 }, 175)).toBe(180);
    // Estava em 3 e o ponteiro vai para a esquerda do topo (≈ 179 min).
    expect(minutesFromPointer(center, { x: 99, y: 0 }, 3)).toBe(1);
  });
});

describe('segurar para destravar', () => {
  it('progresso de 0 a 1 em 3 s; completa em 3 s ou mais', () => {
    expect(HOLD_TO_UNLOCK_MS).toBe(3000);
    expect(holdProgress(null, T0)).toEqual({ progress: 0, completed: false });
    expect(holdProgress(T0, T0)).toEqual({ progress: 0, completed: false });
    expect(holdProgress(T0, T0 + 1500)).toEqual({ progress: 0.5, completed: false });
    expect(holdProgress(T0, T0 + 2999).completed).toBe(false);
    expect(holdProgress(T0, T0 + 3000)).toEqual({ progress: 1, completed: true });
    expect(holdProgress(T0, T0 + 9000).progress).toBe(1);
  });

  it('um relógio que anda para trás não gera progresso negativo', () => {
    expect(holdProgress(T0, T0 - 500).progress).toBe(0);
  });
});

describe('formatação', () => {
  it('mm:ss e h:mm:ss, arredondando para cima', () => {
    expect(formatClock(25 * MIN)).toBe('25:00');
    expect(formatClock(25 * MIN - 1)).toBe('25:00');
    expect(formatClock(59_000)).toBe('00:59');
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(-5)).toBe('00:00');
    expect(formatClock(60 * MIN)).toBe('1:00:00');
    expect(formatClock(90 * MIN + 5_000)).toBe('1:30:05');
    expect(formatClock(180 * MIN)).toBe('3:00:00');
  });

  it('descrições em pt-BR para leitores de tela e resumo', () => {
    expect(describeMinutes(1)).toBe('1 minuto');
    expect(describeMinutes(25)).toBe('25 minutos');
    expect(describeMinutes(60)).toBe('1 hora');
    expect(describeMinutes(90)).toBe('1 hora e 30 minutos');
    expect(describeMinutes(121)).toBe('2 horas e 1 minuto');
    expect(formatFocused(1500)).toBe('25 min');
    expect(formatFocused(3900)).toBe('1 h 05 min');
    expect(formatFocused(40)).toBe('40 s');
  });

  it('título da aba durante a sessão', () => {
    expect(sessionTitle(12 * MIN + 34_000)).toBe('12:34 · Daily');
  });
});
