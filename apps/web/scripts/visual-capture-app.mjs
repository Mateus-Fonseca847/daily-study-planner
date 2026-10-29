/**
 * Captura as telas reais do app (calendário, páginas, menu, modais e toast) com dados de exemplo,
 * em 1440×900 e 1920×1080, para revisão visual. Uso: `pnpm visual:app`.
 * A data é fixada para as capturas serem reproduzíveis.
 */
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');
const outDir = path.resolve(webRoot, '../../docs/design/screenshots/app');
const PORT = 5196;
const BASE = `http://localhost:${PORT}`;
const FIXED_NOW = new Date('2026-11-10T10:00:00');
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

mkdirSync(outDir, { recursive: true });
const server = await createServer({
  root: webRoot,
  logLevel: 'error',
  server: { port: PORT, strictPort: true },
});
await server.listen();
const browser = await chromium.launch();

async function openWithSample(context) {
  const page = await context.newPage();
  await page.clock.setFixedTime(FIXED_NOW);
  await page.goto(`${BASE}/calendario`);
  await page.getByRole('button', { name: 'Carregar dados de exemplo' }).click();
  await page.getByRole('grid', { name: 'Calendário mensal' }).waitFor();
  return page;
}

try {
  for (const viewport of VIEWPORTS) {
    const tag = `${viewport.width}x${viewport.height}`;
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
    });
    const page = await openWithSample(context);
    // Pausa curta: deixa terminar as transições de cor antes da captura.
    const shot = async (name) => {
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(outDir, `${name}-${tag}.png`) });
    };

    await page.mouse.move(viewport.width - 1, viewport.height - 1);
    await shot('calendario');

    // Menu "Criar"
    await page.getByRole('button', { name: 'Criar', exact: true }).click();
    await shot('menu-criar');
    await page.keyboard.press('Escape');

    // Popover de prova e popover "+N mais"
    await page.getByRole('button', { name: /^Prova: Prova de Mecânica/ }).click();
    await shot('popover-prova');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /mais$/ }).first().click();
    await shot('popover-mais');
    await page.keyboard.press('Escape');

    // Modais
    await page.getByRole('button', { name: 'Nova Prova' }).click();
    const form = page.getByRole('dialog', { name: 'Nova prova' });
    await form.getByLabel('Título').fill('Prova de Álgebra Linear');
    for (const title of ['Matrizes', 'Determinantes']) {
      await form.getByRole('button', { name: 'Adicionar conteúdo' }).click();
      await form
        .getByRole('textbox', { name: /^Conteúdo \d+$/ })
        .last()
        .fill(title);
    }
    await shot('modal-prova');
    await form.getByLabel('Título').fill('');
    await form.getByRole('button', { name: 'Salvar' }).click();
    await shot('modal-prova-erro');
    await page.keyboard.press('Escape');

    // Toast "Desfazer"
    await page.getByRole('button', { name: /^Prova: Prova de Mecânica/ }).click();
    await page.getByRole('button', { name: 'Excluir evento' }).click();
    await shot('toast-desfazer');
    await page.getByRole('button', { name: 'Desfazer' }).click();

    // Páginas (espera o título de cada uma antes de capturar)
    for (const [link, heading, name] of [
      [/^Provas/, 'Provas', 'provas'],
      [/^Tarefas/, 'Tarefas', 'tarefas'],
      [/^Matérias/, 'Matérias', 'materias'],
      [/^Blocos de estudo/, 'Blocos de estudo', 'blocos'],
      [/^Preferências/, 'Preferências', 'preferencias'],
    ]) {
      await page.getByRole('link', { name: link }).click();
      await page.getByRole('heading', { level: 1, name: heading }).waitFor();
      await shot(name);
    }

    // Modais de matéria
    await page.getByRole('link', { name: /^Matérias/ }).click();
    await page.getByRole('button', { name: 'Nova matéria' }).click();
    await shot('modal-materia');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Excluir Matemática' }).click();
    await shot('modal-excluir-materia');
    await page.keyboard.press('Escape');

    // Estado de tarefas: página com a primeira tarefa concluída
    await page.getByRole('link', { name: /^Tarefas/ }).click();
    await page
      .getByRole('button', { name: 'Próximos 7 dias' })
      .click()
      .catch(() => {});
    await shot('tarefas-proximos');

    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(`Capturas salvas em ${outDir}`);
