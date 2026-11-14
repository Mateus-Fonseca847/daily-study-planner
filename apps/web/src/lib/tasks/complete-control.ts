import type { EventStatus, EventType } from '@daily/shared';

/**
 * Tamanho do chip ou bloco onde o controle de concluir aparece:
 * - `list`: linha de lista com folga (lista “+N mais”, agenda do Mês no celular, agenda de hoje);
 * - `block`: bloco de Dia/Semana com 2 ou 3 linhas e a coluna inteira;
 * - `compact`: chip da grade do Mês e bloco de 1 linha ou dividido com outro simultâneo;
 * - `tiny`: bloco reduzido à faixa colorida (simultâneos no celular).
 */
export type ChipSize = 'list' | 'block' | 'compact' | 'tiny';

/**
 * Como o controle aparece:
 * - `always`: sempre visível (24 px no mouse, 44 px no toque);
 * - `pointer`: sempre visível com mouse; some no toque (44 px não cabem; conclui-se pelo painel);
 * - `reveal`: com mouse, aparece ao passar o mouse ou ao focar pelo teclado; some no toque;
 * - `none`: não existe.
 */
export type ControlVisibility = 'always' | 'pointer' | 'reveal' | 'none';

/** `toggle` alterna Pendente ↔ Concluído; `cancelled` só mostra o estado; `none` não desenha. */
export type ControlKind = 'toggle' | 'cancelled' | 'none';

export interface CompleteControl {
  kind: ControlKind;
  visibility: ControlVisibility;
}

const NONE: CompleteControl = { kind: 'none', visibility: 'none' };

const VISIBILITY: Record<ChipSize, ControlVisibility> = {
  list: 'always',
  block: 'pointer',
  compact: 'reveal',
  tiny: 'none',
};

/**
 * Regra do “concluir com um clique” nos chips e blocos do calendário. A Prova nunca ganha o
 * controle (ela se prepara por conteúdos); a cancelada mostra o estado sem ação (reabrir fica no
 * painel). Ocorrências de série concluem só a si mesmas (o id `serie@data`), sem perguntar escopo.
 */
export function completeControl(
  event: { type: EventType; status: EventStatus },
  size: ChipSize,
): CompleteControl {
  const visibility = VISIBILITY[size];
  if (event.type === 'prova' || visibility === 'none') return NONE;
  if (event.status === 'cancelado') {
    // O estado já aparece no título riscado; o selo só entra onde há folga.
    return visibility === 'reveal' ? NONE : { kind: 'cancelled', visibility };
  }
  return { kind: 'toggle', visibility };
}

/** Tamanho do bloco de Dia/Semana a partir das linhas que cabem e da divisão em colunas. */
export function blockChipSize(lines: number, columns: number, narrow: boolean): ChipSize {
  if (narrow) return 'tiny';
  return lines >= 2 && columns === 1 ? 'block' : 'compact';
}

/** Texto do estado para o leitor de tela, acrescentado ao rótulo do chip. */
export function statusSuffix(status: EventStatus | undefined): string {
  if (status === 'concluido') return ', concluída';
  if (status === 'cancelado') return ', cancelada';
  return '';
}
