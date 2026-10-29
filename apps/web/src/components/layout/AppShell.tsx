import { useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useData } from '../../lib/data/app-store';
import { navCounts } from '../../lib/data/selectors';
import { appNow } from '../../lib/fixture';
import { ModalHost } from '../forms/ModalHost';
import { ToastRegion } from '../ui/ToastRegion';
import { ShellContext } from './shell-context';
import { Sidebar } from './Sidebar';
import { StorageNotices } from './StorageNotices';
import { Topbar } from './Topbar';

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [subjectId, setSubjectId] = useState('all');
  const events = useData((s) => s.events);
  const counts = useMemo(() => navCounts(events, appNow()), [events]);

  return (
    <ShellContext.Provider value={{ subjectId }}>
      <div className="flex h-full min-w-0 bg-bg">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} counts={counts} />
        <main className="flex min-w-0 flex-1 flex-col">
          <Topbar subjectId={subjectId} onSubjectChange={setSubjectId} />
          <StorageNotices />
          <Outlet />
        </main>
      </div>
      <ModalHost />
      <ToastRegion />
    </ShellContext.Provider>
  );
}
