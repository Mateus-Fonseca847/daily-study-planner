import { useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { appNow } from '../../lib/fixture';
import { eventsFor } from '../../mocks';
import { navCounts } from '../../mocks/counts';
import { ShellContext } from './shell-context';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [subjectId, setSubjectId] = useState('all');
  const counts = useMemo(() => {
    const now = appNow();
    return navCounts(eventsFor(now, now), now);
  }, []);

  return (
    <ShellContext.Provider value={{ subjectId }}>
      <div className="flex h-full min-w-0 bg-bg">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} counts={counts} />
        <main className="flex min-w-0 flex-1 flex-col">
          <Topbar subjectId={subjectId} onSubjectChange={setSubjectId} />
          <Outlet />
        </main>
      </div>
    </ShellContext.Provider>
  );
}
