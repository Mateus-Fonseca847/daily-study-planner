import { useEffect, useRef } from 'react';
import { useData } from '../../../lib/data/app-store';
import { travado } from '../../../lib/focus/session';
import { useUi } from '../../../lib/ui-store';
import type { CalendarView } from './views';

const VIEW_KEYS: Record<string, CalendarView> = { d: 'dia', s: 'semana', m: 'mes', a: 'ano' };

export interface CalendarShortcutHandlers {
  onStep: (direction: 1 | -1) => void;
  onToday: () => void;
  onView: (view: CalendarView) => void;
}

/** O foco está em algo em que se digita (os atalhos não podem roubar as teclas). */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
    target.getAttribute('role') === 'textbox'
  );
}

/**
 * Atalhos do calendário: `←` `→` período anterior e seguinte, `T` hoje, `D` `S` `M` `A` trocam a
 * visão. Desativados com foco em campo de texto, com modal aberto e com o app travado pelo Modo Foco.
 */
export function useCalendarShortcuts(handlers: CalendarShortcutHandlers): void {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.repeat) return;
      if (isTypingTarget(e.target)) return;
      // Menus e diálogos usam as setas para navegar dentro deles.
      if (e.target instanceof Element && e.target.closest('[role="menu"], [role="dialog"]')) return;
      if (useUi.getState().modal !== null) return;
      if (travado(useData.getState().focusActive)) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const { onStep, onToday, onView } = ref.current;
      if (key === 'ArrowLeft') onStep(-1);
      else if (key === 'ArrowRight') onStep(1);
      else if (key === 't') onToday();
      else if (VIEW_KEYS[key]) onView(VIEW_KEYS[key]);
      else return;
      e.preventDefault();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
