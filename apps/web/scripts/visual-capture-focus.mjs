/**
 * Captura os estados do Modo Foco (ocioso, editando, rodando, pausado, travado, concluído)
 * em 1920×1080 e 1280×720, com relógio fixo. Uso: `pnpm visual:focus`.
 */
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');
const outDir = path.resolve(webRoot, '../../docs/design/screenshots/focus');
const PORT = 5193;
const NOW = new Date('2026-11-10T10:00:00');
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1280, height: 720 },
];

mkdirSync(outDir, { recursive: true });
const server = await createServer({
  root: webRoot,
  logLevel: 'error',
  server: { port: PORT, strictPort: true },
});
await server.listen();
const browser = await chromium.launch();

try {
  for (const viewport of VIEWPORTS) {
    const tag = `${viewport.width}x${viewport.height}`;
    const context = await browser.newContext({
      viewport,
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
    });
    const page = await context.newPage();
    page.on('dialog', (dialog) => void dialog.accept());
    await page.clock.install({ time: NOW });
    const shot = async (name) => {
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(outDir, `${name}-${tag}.png`) });
    };
    const field = page.getByRole('textbox', { name: 'Duração da sessão' });

    await page.goto(`http://localhost:${PORT}/foco`);
    await shot('1-ocioso');
    await field.click();
    await field.fill('45:30');
    await shot('2-editando');
    await field.press('Enter');

    await page.getByRole('button', { name: 'Iniciar', exact: true }).click();
    await page.clock.fastForward(12 * 60_000);
    await shot('3-rodando');
    await page.getByRole('button', { name: 'Pausar' }).click();
    await shot('4-pausado');
    await page.getByRole('button', { name: 'Reiniciar' }).click();

    await page.getByRole('button', { name: 'Travar tela ao iniciar' }).click();
    await page.getByRole('button', { name: 'Iniciar', exact: true }).click();
    await page.clock.fastForward(5 * 60_000);
    await shot('5-travado');

    await page.clock.fastForward(60 * 60_000);
    await shot('6-concluido');
    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(`Capturas salvas em ${outDir}`);
