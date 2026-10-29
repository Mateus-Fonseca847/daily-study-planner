import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { MENU_ITEMS, SETTINGS_ITEMS } from './components/layout/nav';
import { CalendarPage } from './features/calendar/CalendarPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

const CALENDAR_PATH = '/calendario';
const PLACEHOLDER_ITEMS = [...MENU_ITEMS, ...SETTINGS_ITEMS].filter((i) => i.to !== CALENDAR_PATH);

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to={CALENDAR_PATH} replace />} />
          <Route path={CALENDAR_PATH} element={<CalendarPage />} />
          {PLACEHOLDER_ITEMS.map((item) => (
            <Route key={item.to} path={item.to} element={<PlaceholderPage item={item} />} />
          ))}
          <Route path="*" element={<Navigate to={CALENDAR_PATH} replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
