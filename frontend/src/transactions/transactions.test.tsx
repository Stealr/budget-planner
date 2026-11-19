import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import axe from 'axe-core';
import { renderWorkspace } from '../test/workspace';
import { apiUrl, mockBudgetApi, transactionFixture } from '../test/budgetApi';
import { server } from '../test/server';
import { today } from '../shared/format';

async function select(label: string, option: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

describe('operations and history', () => {
  it('restores URL filters and sends both sort parameters to the server', async () => {
    const data = mockBudgetApi();
    const { router } = renderWorkspace(
      '/transactions?type=EXPENSE&categoryId=2&dateFrom=2026-11-01&dateTo=2026-11-30',
    );
    expect(await screen.findByText('Учебник')).toBeInTheDocument();
    const request = data.requests.find(({ path }) => path.endsWith('/transactions'))!;
    expect(request.params.get('categoryId')).toBe('2');
    expect(request.params.get('type')).toBe('EXPENSE');
    expect(request.params.get('dateFrom')).toBe('2026-11-01');
    expect(request.params.get('dateTo')).toBe('2026-11-30');
    expect(request.params.getAll('sort')).toEqual(['transactionDate,desc', 'id,desc']);
    expect(screen.getByLabelText('Дата с')).toHaveValue('2026-11-01');
    expect(
      data.requests.find(({ path }) => path.endsWith('/categories'))!.params.get('includeArchived'),
    ).toBe('true');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Сбросить фильтры' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('applies filters from any page, resets pagination, and restores them on browser back', async () => {
    const data = mockBudgetApi(
      Array.from({ length: 21 }, (_, index) => ({ ...transactionFixture, id: index + 1 })),
    );
    const { router } = renderWorkspace('/transactions?page=1');
    await screen.findByRole('button', { name: 'Редактировать операцию 21' });
    await select('Тип', 'Доход');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Применить фильтры' }));
    expect(
      await screen.findByText('По выбранным фильтрам операций не найдено.'),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe('?type=INCOME');
    expect(data.requests.at(-1)!.params.get('page')).toBe('0');
    await act(async () => {
      await router.navigate(-1);
    });
    expect(
      await screen.findByRole('button', { name: 'Редактировать операцию 21' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Тип' })).toHaveTextContent('Все типы');
  });

  it('rejects an inverted date range in the URL without requesting history', async () => {
    const data = mockBudgetApi();
    renderWorkspace('/transactions?dateFrom=2026-11-30&dateTo=2026-11-01');
    expect(await screen.findByText(/Некорректные фильтры в адресе/)).toBeInTheDocument();
    expect(data.requests.some(({ path }) => path.endsWith('/transactions'))).toBe(false);
    fireEvent.change(screen.getByLabelText('Дата по'), { target: { value: '2026-11-30' } });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Применить фильтры' }));
    expect(
      await screen.findByText('По выбранным фильтрам операций не найдено.'),
    ).toBeInTheDocument();
  });

  it.each(['Расход', 'Доход'])(
    'creates a %s with kopecks and the matching active category',
    async (type) => {
      const data = mockBudgetApi([]);
      renderWorkspace('/transactions');
      const user = userEvent.setup();
      await user.click(await screen.findByRole('button', { name: 'Добавить операцию' }));
      await select('Тип операции', type);
      await user.type(screen.getByLabelText('Сумма, ₽'), '450,50');
      await select('Категория', type === 'Расход' ? 'Книги' : 'Стипендия');
      await user.type(screen.getByLabelText('Комментарий'), 'Новая запись');
      await user.click(screen.getByRole('button', { name: 'Сохранить' }));
      expect(await screen.findByText('Новая запись')).toBeInTheDocument();
      const request = data.requests.find(({ method }) => method === 'POST')!;
      expect(request.body).toEqual({
        amount: 450.5,
        type: type === 'Расход' ? 'EXPENSE' : 'INCOME',
        categoryId: type === 'Расход' ? 2 : 3,
        transactionDate: today(),
        description: 'Новая запись',
      });
    },
  );

  it('clears an incompatible category when the transaction type changes', async () => {
    mockBudgetApi();
    renderWorkspace('/transactions');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Добавить операцию' }));
    await select('Категория', 'Книги');
    await select('Тип операции', 'Доход');
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
    await user.click(screen.getByRole('combobox', { name: 'Категория' }));
    expect(screen.queryByRole('option', { name: 'Книги' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Стипендия' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Старые подписки/ })).not.toBeInTheDocument();
  });

  it('edits a historical transaction while keeping its original archived category', async () => {
    const data = mockBudgetApi([
      { ...transactionFixture, categoryId: 4, categoryName: 'Старые подписки' },
    ]);
    renderWorkspace('/transactions');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Редактировать операцию 11' }));
    expect(screen.getByRole('combobox', { name: 'Категория' })).toHaveTextContent(
      'Старые подписки (архив)',
    );
    await user.click(screen.getByRole('combobox', { name: 'Категория' }));
    expect(screen.queryByRole('option', { name: /Старый транспорт/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Старые подписки (архив)' }));
    await user.clear(screen.getByLabelText('Сумма, ₽'));
    await user.type(screen.getByLabelText('Сумма, ₽'), '700');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByText('Операция сохранена.')).toBeInTheDocument();
    expect(data.requests.find(({ method }) => method === 'PUT')!.body).toMatchObject({
      categoryId: 4,
      amount: 700,
    });
    expect(within(screen.getByRole('table')).getByText('Старые подписки')).toBeInTheDocument();
  });

  it.each([
    [404, 'Transaction not found: 11', 'Запись больше недоступна. Возможно, она уже удалена.'],
    [404, 'Category not found: 2', 'Категория больше недоступна. Выберите другую категорию.'],
    [
      409,
      'Cannot assign an archived category',
      'Категория архивирована. Выберите активную категорию.',
    ],
  ])('preserves form values on save failure %s (%s)', async (status, message, expected) => {
    mockBudgetApi();
    server.use(
      http.put(`${apiUrl}/transactions/11`, () =>
        HttpResponse.json({ status, message }, { status }),
      ),
    );
    renderWorkspace('/transactions');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Редактировать операцию 11' }));
    await user.clear(screen.getByLabelText('Сумма, ₽'));
    await user.type(screen.getByLabelText('Сумма, ₽'), '99,99');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByText(expected)).toBeInTheDocument();
    expect(screen.getByLabelText('Сумма, ₽')).toHaveValue('99,99');
  });

  it('requires confirmation and returns to a valid page after deleting its last transaction', async () => {
    const data = mockBudgetApi(
      Array.from({ length: 21 }, (_, index) => ({ ...transactionFixture, id: index + 1 })),
    );
    const { router } = renderWorkspace('/transactions?page=1');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Удалить операцию 21' }));
    expect(screen.getByRole('dialog', { name: 'Удалить операцию?' })).toHaveTextContent('450,50');
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(data.requests.some(({ method }) => method === 'DELETE')).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Удалить операцию 21' }));
    await user.click(screen.getByRole('button', { name: 'Удалить' }));
    expect(await screen.findByText('Операция удалена.')).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(
      await screen.findByRole('button', { name: 'Редактировать операцию 1' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Удалить операцию 21' })).not.toBeInTheDocument();
  });

  it('distinguishes an empty account from no results and hides the unsupported import action', async () => {
    mockBudgetApi([]);
    renderWorkspace('/transactions');
    expect(
      await screen.findByText('Операций пока нет. Добавьте первый доход или расход.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Импортировать выписку' })).not.toBeInTheDocument();
  });

  it('provides accessible filters, editing and delete confirmation', async () => {
    mockBudgetApi();
    renderWorkspace('/transactions');
    const user = userEvent.setup();
    await screen.findByText('Учебник');
    const form = screen.getByRole('form', { name: 'Фильтры операций' });
    expect(
      (await axe.run(form, { rules: { 'color-contrast': { enabled: false } } })).violations,
    ).toEqual([]);
    await user.click(screen.getByRole('button', { name: 'Редактировать операцию 11' }));
    expect(
      (
        await axe.run(screen.getByRole('dialog'), {
          rules: { 'color-contrast': { enabled: false } },
        })
      ).violations,
    ).toEqual([]);
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    await user.click(screen.getByRole('button', { name: 'Удалить операцию 11' }));
    expect(
      (
        await axe.run(screen.getByRole('dialog'), {
          rules: { 'color-contrast': { enabled: false } },
        })
      ).violations,
    ).toEqual([]);
  });
});
