import { create } from 'zustand';

/** Tempo do toast com “Desfazer”. */
export const UNDO_MS = 6000;

export interface Toast {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs: number;
}

interface ToastState {
  toasts: Toast[];
  push(toast: Omit<Toast, 'id' | 'durationMs'> & { durationMs?: number }): number;
  dismiss(id: number): void;
}

let nextId = 1;

export const useToasts = create<ToastState>()((set) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { durationMs: UNDO_MS, ...toast, id }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
