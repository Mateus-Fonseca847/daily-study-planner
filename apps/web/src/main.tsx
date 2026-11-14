import './lib/zod-config'; // antes de qualquer schema ser criado
import '@fontsource-variable/inter';
import './styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { startAchievements } from './lib/achievements/start';
import { startAuth } from './lib/auth/auth-store';
import { setupPwa } from './lib/pwa/register';
import { installVisualViewport } from './lib/responsive/visual-viewport';
import { startFriends } from './lib/social/friends-store';
import { startSocial } from './lib/social/social-store';
import { startSync } from './lib/sync/runtime';
import { startTheme } from './lib/theme/theme-store';

startTheme();
setupPwa();
installVisualViewport();
startAuth();
startSync();
startAchievements();
startSocial();
startFriends();

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
