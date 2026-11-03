import { useEffect, useRef } from 'react';

/** Estado que cada sheet/modal de celular deixa no histórico para o botão "voltar" fechá-lo. */
interface SheetEntry {
  daily_sheet?: string;
}

const entryOf = (state: unknown): string | undefined => (state as SheetEntry | null)?.daily_sheet;

let counter = 0;

/**
 * No celular o botão "voltar" do aparelho (e o gesto de voltar) deve fechar o sheet, não sair da
 * página. O sheet empurra uma entrada no histórico ao abrir; "voltar" a desempilha e o sheet fecha.
 *
 * Mantém o `idx` do React Router: a entrada nova copia o estado atual (com `usr`, `key` e `idx`),
 * então o roteador a trata como a mesma localização.
 *
 * Devolve `requestClose`: use-a no X, no Esc e no arrasto. Ela desempilha a entrada (e o `popstate`
 * resultante chama `onClose`); sem entrada, chama `onClose` direto.
 */
export function useBackToClose(enabled: boolean, onClose: () => void): () => void {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const idRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const id = `sheet-${(counter += 1)}`;
    let pushed = false;
    // Adiado para a rodada seguinte: o StrictMode monta, desmonta e monta de novo, e o push só
    // deve acontecer na montagem que fica.
    const timer = window.setTimeout(() => {
      window.history.pushState({ ...(window.history.state as object | null), daily_sheet: id }, '');
      pushed = true;
      idRef.current = id;
    }, 0);

    const onPopState = () => {
      if (pushed && entryOf(window.history.state) !== id) {
        pushed = false;
        idRef.current = null;
        onCloseRef.current();
      }
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('popstate', onPopState);
      // Fechado por outro caminho (ação concluída, troca de página): remove a entrada que sobrou.
      if (pushed && entryOf(window.history.state) === id) window.history.back();
      idRef.current = null;
    };
  }, [enabled]);

  return () => {
    const id = idRef.current;
    if (id && entryOf(window.history.state) === id) window.history.back();
    else onCloseRef.current();
  };
}
