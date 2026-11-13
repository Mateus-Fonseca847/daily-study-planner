import { test } from '@playwright/test';
import { expectRingsInsidePanel } from '../helpers';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('painel “Nova tarefa” em tela cheia: anel de foco dentro da área visível (celular)', async ({
  page,
}) => {
  await page.goto('/calendario');
  await page.getByRole('button', { name: 'Criar', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Tarefa' }).click();
  await expectRingsInsidePanel(page);
});
