import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

const expenseDate = '2025-11-15';

test.beforeEach(async ({ page }) => {
  const email = `e2e-${randomUUID()}@example.com`;
  const password = randomUUID();

  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page.getByRole('heading', { name: 'Вход', exact: true })).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveValue(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL(/\/$/);
});

async function addExpense(page: Page, category: string, amount: string, description: string) {
  await page.getByRole('button', { name: 'Добавить операцию' }).click();
  const dialog = page.getByRole('dialog', { name: 'Добавить операцию' });
  await dialog.getByLabel('Сумма, ₽').fill(amount);
  await dialog.getByLabel('Дата', { exact: true }).fill(expenseDate);
  await dialog.getByLabel('Комментарий').fill(description);
  await dialog.getByRole('combobox', { name: 'Категория', exact: true }).click();
  await page.getByRole('option', { name: category, exact: true }).click();
  await dialog.getByRole('button', { name: 'Сохранить' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('cell', { name: description, exact: true })).toBeVisible();
}

test('предупреждает о превышении месячного лимита и сохраняет итог', async ({ page }) => {
  const category = 'Еда';
  const limitsPath = `/limits?month=${expenseDate.slice(0, 7)}`;

  await page.goto(limitsPath);
  await page.getByRole('button', { name: 'Задать лимит' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Категория расходов' }).click();
  await page.getByRole('option', { name: category, exact: true }).click();
  await dialog.getByLabel('Лимит, ₽').fill('100');
  await dialog.getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.getByRole('article', { name: `Лимит ${category}` })).toBeVisible();

  await page.goto('/transactions');
  await addExpense(page, category, '80', 'Первый расход');
  await expect(page.getByRole('alert').getByText('Достигнут порог 80% лимита')).toBeVisible();
  await addExpense(page, category, '20,01', 'Расход сверх лимита');
  await expect(page.getByRole('alert').getByText('Лимит превышен', { exact: true })).toBeVisible();

  await page.goto(limitsPath);
  const limit = page.getByRole('article', { name: `Лимит ${category}` });
  await expect(limit.getByText('Превышение: 0,01 ₽')).toBeVisible();
  await page.reload();
  await expect(limit.getByText('Потрачено 100,01 ₽ из 100,00 ₽')).toBeVisible();
  await expect(limit.getByText('Превышение: 0,01 ₽')).toBeVisible();
});

test('архивация категории сохраняет расход в истории и исключает категорию из формы', async ({
  page,
}) => {
  const category = 'Учебные материалы';
  const description = 'Рабочая тетрадь';

  await page.goto('/categories');
  await page.getByRole('button', { name: 'Создать категорию' }).click();
  const creation = page.getByRole('dialog', { name: 'Создать категорию' });
  await creation.getByLabel('Название').fill(category);
  await creation.getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.getByText(category, { exact: true })).toBeVisible();

  await page.goto('/transactions');
  await addExpense(page, category, '50', description);
  await page.goto('/categories');
  await page.getByRole('button', { name: `Архивировать категорию ${category}` }).click();
  await page
    .getByRole('dialog', { name: 'Архивировать категорию?' })
    .getByRole('button', { name: 'Архивировать', exact: true })
    .click();
  await expect(page.getByText('Категория архивирована. История операций сохранена.')).toBeVisible();
  await expect(page.getByText(category, { exact: true })).toBeHidden();
  await page.getByRole('switch', { name: 'Показывать архивные' }).click();
  const archived = page.getByRole('listitem').filter({ hasText: category });
  await expect(archived.getByText('В архиве')).toBeVisible();

  await page.goto('/transactions');
  const historicalExpense = page.getByRole('row').filter({ hasText: description });
  await expect(
    historicalExpense.getByRole('cell', { name: `${category} Расход`, exact: true }),
  ).toBeVisible();
  await expect(
    historicalExpense.getByRole('cell', { name: '-50,00 ₽', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Добавить операцию' }).click();
  const expense = page.getByRole('dialog', { name: 'Добавить операцию' });
  await expense.getByRole('combobox', { name: 'Категория', exact: true }).click();
  const options = page.getByRole('listbox');
  await expect(options.getByRole('option', { name: 'Еда', exact: true })).toBeVisible();
  await expect(options.getByRole('option', { name: category })).toHaveCount(0);
});
