import './lib/zod-config'; // antes de qualquer schema ser criado
import '@fontsource-variable/inter';
import './styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { startAuth } from './lib/auth/auth-store';
import { setupPwa } from './lib/pwa/register';
import { startSync } from './lib/sync/runtime';

setupPwa();
startAuth();
startSync();

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
