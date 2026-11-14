import { expect, test, type Page } from '@playwright/test';

const NOW = new Date('2026-11-10T10:30:00');

/** Subtítulos que saíram dos cabeçalhos (Prompt 17). */
const OLD_SUBTITLES = [
  'Acompanhe o que você repete',
  'Tarefas, provas e especiais: o que está atrasado',
  'Suas provas, com contagem regressiva',
  'Organize seus estudos por matéria',
  'Perfil, Modo Foco e backup dos seus dados',
  'Pessoas com quem você se conectou',
];
const PAGES = ['/habitos', '/tarefas', '/provas', '/materias', '/preferencias'];

async function createFromButton(page: Page) {
  await page.getByRole('main').getByRole('button', { name: 'Nova tarefa' }).click();
  const panel = page.getByRole('dialog', { name: 'Nova tarefa' });
  await panel.getByLabel('Título', { exact: true }).fill('Ler capítulo 4');
  await panel.getByRole('button', { name: 'Criar tarefa' }).click();
  await expect(panel).toBeHidden();
  await expect(page.getByRole('button', { name: /^Ler capítulo 4/ }).first()).toBeVisible();
}

test.describe('páginas sem textos descritivos', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: NOW });
  });

  test('nenhuma página mostra o subtítulo antigo; o título continua como h1', async ({ page }) => {
    for (const url of PAGES) {
      await page.goto(url);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      for (const text of OLD_SUBTITLES) {
        await expect(page.getByText(text)).toHaveCount(0);
      }
    }
  });

  test('Tarefas: sem cartões de resumo e sem a entrada rápida', async ({ page }) => {
    await page.goto('/tarefas?fixture=views');
    for (const label of ['Concluídas na semana', 'Próximas provas']) {
      await expect(page.getByText(label, { exact: true })).toHaveCount(0);
    }
    await expect(page.getByRole('textbox', { name: 'Nova tarefa' })).toHaveCount(0);
    await expect(page.getByText(/Entendi:/)).toHaveCount(0);
  });

  test('“Nova tarefa” abre o painel e cria a tarefa (desktop)', async ({ page }) => {
    await page.goto('/tarefas');
    await createFromButton(page);
  });

  test.describe('celular', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test('“Nova tarefa” no cabeçalho, com alvo de toque, abre o painel e cria', async ({
      page,
    }) => {
      await page.goto('/tarefas');
      const button = page.getByRole('main').getByRole('button', { name: 'Nova tarefa' });
      const box = await button.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      await createFromButton(page);
    });
  });
});
