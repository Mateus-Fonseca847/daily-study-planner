import { create } from 'zustand';
import { EVENT_TYPES, type EventType } from '@daily/shared';
import { browserStorage } from '../browser-storage';

/** Preferência de interface (não faz parte do snapshot nem sincroniza). */
export const TYPE_FILTER_KEY = 'daily:ui:type-filter';

/** Lê o filtro salvo; qualquer coisa inválida vira “todos” (conjunto vazio). */
export function parseTypeFilter(raw: string | null): Set<EventType> {
  if (!raw) return new Set();
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return new Set();
    return new Set(
      value.filter((t): t is EventType => (EVENT_TYPES as readonly unknown[]).includes(t)),
    );
  } catch {
    return new Set();
  }
}

function read(): Set<EventType> {
  try {
    return parseTypeFilter(browserStorage().getItem(TYPE_FILTER_KEY));
  } catch {
    return new Set();
  }
}

function write(types: ReadonlySet<EventType>): void {
  try {
    if (types.size === 0) browserStorage().removeItem(TYPE_FILTER_KEY);
    else browserStorage().setItem(TYPE_FILTER_KEY, JSON.stringify([...types]));
  } catch {
    /* sem armazenamento: o filtro vale só nesta sessão */
  }
}

interface TypeFilterState {
  /** Tipos visíveis; vazio = todos. */
  types: ReadonlySet<EventType>;
  toggle(type: EventType): void;
  /** “Todos” e “Limpar” mostram tudo (conjunto vazio). */
  clear(): void;
}

/** Filtro global por tipo (calendário e página Tarefas), salvo entre sessões. */
export const useTypeFilter = create<TypeFilterState>()((set, get) => ({
  types: read(),
  toggle: (type) => {
    const next = new Set(get().types);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    // Marcar os três é o mesmo que “todos”.
    const normalized = next.size === EVENT_TYPES.length ? new Set<EventType>() : next;
    write(normalized);
    set({ types: normalized });
  },
  clear: () => {
    write(new Set());
    set({ types: new Set() });
  },
}));
