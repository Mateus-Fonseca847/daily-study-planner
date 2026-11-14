import { expect, test, type Locator, type Page } from '@playwright/test';
import { seedSnapshot } from './helpers';

/** Série semanal (toda terça) com 40 subtarefas-modelo. */
const SERIES = {
  id: 'serie',
  type: 'tarefa',
  title: 'Revisão semanal',
  start: '2026-11-10T19:00:00',
  end: '2026-11-10T20:00:00',
  subjectId: null,
  status: 'pendente',
  notes: '',
  subtasks: Array.from({ length: 40 }, (_, i) => ({
    id: `s${i}`,
    title: `Item ${i + 1}`,
    done: false,
    order: i,
  })),
  createdAt: '2026-11-01T08:00:00',
  recurrence: { freq: 'semanal', interval: 1, weekdays: [2], end: { kind: 'nunca' } },
};

const SIZES = [
  { name: 'celular', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'paisagem', width: 844, height: 390 },
  { name: 'janela baixa', width: 1280, height: 560 },
] as const;

/** O elemento está inteiro dentro da janela (nada cortado embaixo nem em cima). */
async function inViewport(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  const view = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(view.height + 0.5);
}

for (const size of SIZES) {
  test.describe(`modal longo (${size.name})`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test('Prova com 40 conteúdos: “Criar prova” sempre visível e só o miolo rola', async ({
      page,
    }) => {
      await page.clock.install({ time: new Date('2026-11-10T10:30:00') });
      await page.goto('/tarefas');
      await page.getByRole('button', { name: 'Criar', exact: true }).first().click();
      await page.getByRole('menuitem', { name: 'Prova' }).click();
      const form = page.getByRole('dialog', { name: 'Nova prova' });
      await form.getByLabel('Título', { exact: true }).fill('Prova longa');
      const input = form.getByLabel('Novo conteúdo');
      for (let i = 1; i <= 40; i += 1) {
        await input.fill(`Conteúdo ${i}`);
        await input.press('Enter');
      }
      await expect(form.getByLabel('Título de “Conteúdo 40”')).toBeAttached();

      const save = form.getByRole('button', { name: 'Criar prova' });
      await inViewport(page, save);
      await inViewport(page, form.getByRole('button', { name: 'Fechar' }));
      // O foco segue preso no diálogo: Tab a partir do último botão volta para dentro dele.
      await save.focus();
      await page.keyboard.press('Tab');
      await expect(form.locator(':focus')).toHaveCount(1);

      // O documento não rola; quem rola é o miolo do diálogo.
      const pageScroll = await page.evaluate(
        () => document.scrollingElement!.scrollHeight - window.innerHeight,
      );
      expect(pageScroll).toBeLessThanOrEqual(0);
      await save.click();
      await expect(form).toBeHidden();
    });

    test('ocorrência com 40 subtarefas: o rodapé “Salvar…” aparece e fica visível', async ({
      page,
    }) => {
      await page.clock.install({ time: new Date('2026-11-10T10:30:00') });
      await seedSnapshot(page, { events: [SERIES] });
      await page.goto('/calendario?visao=dia&data=2026-11-10');
      // Pelo teclado: em paisagem o bloco das 19h fica atrás da barra inferior.
      await page.getByRole('button', { name: /^Tarefa: Revisão semanal,/ }).focus();
      await page.keyboard.press('Enter');
      const panel = page.getByRole('dialog', { name: 'Revisão semanal' });
      await panel.getByLabel('Título', { exact: true }).fill('Revisão da semana');
      const save = panel.getByRole('button', { name: 'Salvar…' });
      await inViewport(page, save);
      await inViewport(page, panel.getByRole('button', { name: 'Descartar' }));
    });

    test('formulário de hábito: “Criar hábito” visível sem rolar a página', async ({ page }) => {
      await page.goto('/habitos');
      await page.getByRole('button', { name: 'Novo hábito' }).first().click();
      const dialog = page.getByRole('dialog', { name: 'Novo hábito' });
      await inViewport(page, dialog.getByRole('button', { name: 'Criar hábito' }));
    });
  });
}
