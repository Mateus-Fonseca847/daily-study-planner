import { createContext, useContext } from 'react';

export interface ShellContextValue {
  /** Matéria selecionada na topbar (`all` = todas). */
  subjectId: string;
}

export const ShellContext = createContext<ShellContextValue>({ subjectId: 'all' });

export const useShell = (): ShellContextValue => useContext(ShellContext);
