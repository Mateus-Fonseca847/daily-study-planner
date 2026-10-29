import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { MENU_ITEMS, SETTINGS_ITEMS } from './components/layout/nav';
import { BlocksPage } from './features/blocks/BlocksPage';
import { CalendarPage } from './features/calendar/CalendarPage';
import { ExamsPage } from './features/exams/ExamsPage';
import { PreferencesPage } from './features/preferences/PreferencesPage';
import { SubjectsPage } from './features/subjects/SubjectsPage';
import { TasksPage } from './features/tasks/TasksPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

const CALENDAR_PATH = '/calendario';

/** Páginas reais; as demais rotas do menu mostram o placeholder. */
const PAGES: Record<string, ReactNode> = {
  [CALENDAR_PATH]: <CalendarPage />,
  '/provas': <ExamsPage />,
  '/tarefas': <TasksPage />,
  '/materias': <SubjectsPage />,
  '/blocos': <BlocksPage />,
  '/preferencias': <PreferencesPage />,
};

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to={CALENDAR_PATH} replace />} />
          {[...MENU_ITEMS, ...SETTINGS_ITEMS].map((item) => (
            <Route
              key={item.to}
              path={item.to}
              element={PAGES[item.to] ?? <PlaceholderPage item={item} />}
            />
          ))}
          <Route path="*" element={<Navigate to={CALENDAR_PATH} replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
