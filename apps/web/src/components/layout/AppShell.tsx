import { useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useData } from '../../lib/data/app-store';
import { navCounts } from '../../lib/data/selectors';
import { travado } from '../../lib/focus/session';
import { appNow } from '../../lib/fixture';
import { useHabitModel } from '../../features/habits/useHabitModel';
import { pendingToday } from '../../lib/habits';
import { usePersistOnFirstData, useUpdateOffer } from '../../lib/pwa/use-pwa';
import { ModalHost } from '../forms/ModalHost';
import { ToastRegion } from '../ui/ToastRegion';
import { FocusLockGuard, FocusRuntime } from './FocusRuntime';
import { ShellContext } from './shell-context';
import { Sidebar } from './Sidebar';
import { StorageNotices } from './StorageNotices';
import { Topbar } from './Topbar';

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [subjectId, setSubjectId] = useState('all');
  const events = useData((s) => s.events);
  const locked = travado(useData((s) => s.focusActive));
  useUpdateOffer();
  usePersistOnFirstData();
  const habitModel = useHabitModel();
  const pendingHabits = pendingToday(habitModel.habits, habitModel.ctx).length;
  const counts = useMemo(() => navCounts(events, appNow(), pendingHabits), [events, pendingHabits]);

  return (
    <ShellContext.Provider value={{ subjectId }}>
      <FocusRuntime />
      <FocusLockGuard locked={locked} />
      <div className="relative flex h-full min-w-0 overflow-hidden bg-bg">
        {/* Travado: sem barra lateral, sem topo e sem links — só a página do Modo Foco. */}
        {!locked && (
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} counts={counts} />
        )}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {!locked && <Topbar subjectId={subjectId} onSubjectChange={setSubjectId} />}
          <StorageNotices />
          <Outlet />
        </main>
      </div>
      <ModalHost />
      <ToastRegion />
    </ShellContext.Provider>
  );
}
