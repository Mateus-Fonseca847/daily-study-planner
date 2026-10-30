import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate, RouterProvider, type RouteObject } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { MENU_ITEMS, SETTINGS_ITEMS } from './components/layout/nav';
import { BlocksPage } from './features/blocks/BlocksPage';
import { CalendarPage } from './features/calendar/CalendarPage';
import { ExamsPage } from './features/exams/ExamsPage';
import { HabitsPage } from './features/habits/HabitsPage';
import { FocusPage } from './features/focus/FocusPage';
import { StatsPage } from './features/stats/StatsPage';
import { PreferencesPage } from './features/preferences/PreferencesPage';
import { SubjectsPage } from './features/subjects/SubjectsPage';
import { TasksPage } from './features/tasks/TasksPage';
import { EntryRedirect } from './pages/EntryRedirect';
import { LoginPage } from './pages/LoginPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { PrivacyPage } from './pages/PrivacyPage';

const CALENDAR_PATH = '/calendario';

/** Páginas reais; as demais rotas do menu mostram o placeholder. */
const PAGES: Record<string, ReactNode> = {
  [CALENDAR_PATH]: <CalendarPage />,
  '/provas': <ExamsPage />,
  '/tarefas': <TasksPage />,
  '/materias': <SubjectsPage />,
  '/blocos': <BlocksPage />,
  '/habitos': <HabitsPage />,
  '/foco': <FocusPage />,
  '/estatisticas': <StatsPage />,
  '/preferencias': <PreferencesPage />,
};

const routes: RouteObject[] = [
  // Fora do shell: sem barra lateral nem topo.
  { path: '/entrar', element: <LoginPage /> },
  { path: '/privacidade', element: <PrivacyPage /> },
  {
    // Roteador de dados: necessário para o bloqueador de navegação do Modo Foco (`useBlocker`).
    element: <AppShell />,
    children: [
      { index: true, element: <EntryRedirect /> },
      ...[...MENU_ITEMS, ...SETTINGS_ITEMS].map((item) => ({
        path: item.to,
        element: PAGES[item.to] ?? <PlaceholderPage item={item} />,
      })),
      { path: '*', element: <Navigate to={CALENDAR_PATH} replace /> },
    ],
  },
];

const router = createBrowserRouter(routes);

export function App() {
  return <RouterProvider router={router} />;
}
