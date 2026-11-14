import { useCallback, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useData } from '../../lib/data/app-store';
import { navCounts } from '../../lib/data/selectors';
import { travado } from '../../lib/focus/session';
import { appNow } from '../../lib/fixture';
import { readSidebarCollapsed, saveSidebarCollapsed } from '../../lib/layout-prefs';
import { useBreakpoint } from '../../lib/responsive/use-media';
import { cn } from '../../lib/cn';
import { useHabitModel } from '../../features/habits/useHabitModel';
import { pendingToday } from '../../lib/habits';
import { usePersistOnFirstData, useUpdateOffer } from '../../lib/pwa/use-pwa';
import { ConflictDialog } from '../../features/account/ConflictDialog';
import { ModalHost } from '../forms/ModalHost';
import { ToastRegion } from '../ui/ToastRegion';
import { BottomBar } from './BottomBar';
import { Fab } from './Fab';
import { FocusLockGuard, FocusRuntime } from './FocusRuntime';
import { MoreSheet, MORE_ITEMS } from './MoreSheet';
import { PhoneTopbar } from './PhoneTopbar';
import { Sidebar } from './Sidebar';
import { SidebarOverlay } from './SidebarOverlay';
import { StorageNotices } from './StorageNotices';
import { Topbar } from './Topbar';

export function AppShell() {
  const layout = useBreakpoint();
  const { pathname } = useLocation();
  // Desktop sempre começa expandida (como antes); só o notebook pequeno lembra a escolha.
  const [collapsed, setCollapsed] = useState(() =>
    layout === 'notebook' ? readSidebarCollapsed() : false,
  );
  const [overlayOpen, setOverlayOpen] = useState(false);
  // O sheet "Mais" fecha sozinho ao navegar: ele só está aberto na página em que foi aberto.
  const [moreFor, setMoreFor] = useState<string | null>(null);
  const moreOpen = moreFor === pathname;
  const events = useData((s) => s.events);
  const locked = travado(useData((s) => s.focusActive));
  useUpdateOffer();
  usePersistOnFirstData();
  const habitModel = useHabitModel();
  const pendingHabits = pendingToday(habitModel.habits, habitModel.ctx).length;
  const exceptions = useData((s) => s.exceptions);
  const counts = useMemo(
    () => navCounts(events, appNow(), pendingHabits, exceptions),
    [events, pendingHabits, exceptions],
  );

  const phone = layout === 'phone';
  const tablet = layout === 'tablet';

  const closeOverlay = useCallback(() => setOverlayOpen(false), []);
  const closeMore = useCallback(() => setMoreFor(null), []);

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (layout === 'notebook') saveSidebarCollapsed(next);
  };

  return (
    <>
      <FocusRuntime />
      <FocusLockGuard locked={locked} />
      <div
        className={cn(
          'relative flex h-full min-w-0 overflow-hidden bg-bg',
          phone && 'flex-col pr-safe-right pl-safe-left',
        )}
      >
        {/* Travado: sem barra lateral, sem topo e sem links — só a página do Modo Foco. */}
        {!locked && !phone && !tablet && (
          <Sidebar collapsed={collapsed} onToggle={toggleSidebar} counts={counts} />
        )}
        {!locked && tablet && (
          <>
            <Sidebar collapsed onToggle={() => setOverlayOpen(true)} counts={counts} />
            {overlayOpen && <SidebarOverlay counts={counts} onClose={closeOverlay} />}
          </>
        )}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {!locked && (phone ? <PhoneTopbar /> : <Topbar />)}
          <StorageNotices />
          <Outlet />
        </main>
        {!locked && phone && (
          <>
            <BottomBar
              counts={counts}
              moreActive={
                MORE_ITEMS.some((item) => item.to === pathname) || pathname === '/preferencias'
              }
              moreOpen={moreOpen}
              onMore={() => setMoreFor(pathname)}
            />
            <Fab />
          </>
        )}
      </div>
      {phone && !locked && moreOpen && <MoreSheet counts={counts} onClose={closeMore} />}
      <ConflictDialog />
      <ModalHost />
      <ToastRegion />
    </>
  );
}
