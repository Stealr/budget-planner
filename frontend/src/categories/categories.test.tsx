import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import axe from 'axe-core';
import { renderWorkspace } from '../test/workspace';
import { apiUrl, mockBudgetApi } from '../test/budgetApi';
import { server } from '../test/server';

describe('category management', () => {
  it('protects standard categories and includes archives only on request', async () => {
    const data = mockBudgetApi();
    const { router } = renderWorkspace('/categories');
    await screen.findByText('Еда');
    expect(
      screen.queryByRole('button', { name: 'Изменить категорию Еда' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Удалить категорию Еда' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Архивировать категорию Еда' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Старые подписки')).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('switch', { name: 'Показывать архивные' }));
    expect(await screen.findByText('Старые подписки')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?includeArchived=true');
    expect(data.requests.at(-1)!.params.get('includeArchived')).toBe('true');
    expect(
      screen.queryByRole('button', { name: 'Архивировать категорию Старые подписки' }),
    ).not.toBeInTheDocument();
    await act(async () => {
      await router.navigate(-1);
    });
    await waitFor(() => expect(screen.queryByText('Старые подписки')).not.toBeInTheDocument());
  });

  it('creates a custom category with a trimmed name', async () => {
    const data = mockBudgetApi();
    renderWorkspace('/categories');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Создать категорию' }));
    await user.type(screen.getByLabelText('Название'), '  Кофе  ');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByText('Кофе')).toBeInTheDocument();
    expect(data.requests.find(({ method }) => method === 'POST')!.body).toEqual({
      name: 'Кофе',
      type: 'EXPENSE',
    });
  });

  it('refreshes transaction names after a category is renamed', async () => {
    mockBudgetApi();
    const { router } = renderWorkspace('/transactions');
    expect(await screen.findByText('Учебник')).toBeInTheDocument();
    await act(async () => {
      await router.navigate('/categories');
    });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Изменить категорию Книги' }));
    await user.clear(screen.getByLabelText('Название'));
    await user.type(screen.getByLabelText('Название'), 'Учёба');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByText('Категория сохранена.')).toBeInTheDocument();
    await act(async () => {
      await router.navigate('/transactions');
    });
    expect(await within(await screen.findByRole('table')).findByText('Учёба')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).queryByText('Книги')).not.toBeInTheDocument();
  });

  it('preserves edits after a category type conflict', async () => {
    mockBudgetApi();
    server.use(
      http.put(`${apiUrl}/categories/2`, () =>
        HttpResponse.json(
          { message: 'Cannot change type of a category with transactions' },
          { status: 409 },
        ),
      ),
    );
    renderWorkspace('/categories');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Изменить категорию Книги' }));
    await user.clear(screen.getByLabelText('Название'));
    await user.type(screen.getByLabelText('Название'), 'Учёба');
    await user.click(screen.getByRole('combobox', { name: 'Тип категории' }));
    await user.click(screen.getByRole('option', { name: 'Доход' }));
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(
      await screen.findByText(
        'Нельзя изменить тип категории с операциями. Название можно изменить отдельно.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Название')).toHaveValue('Учёба');
    expect(screen.getByRole('combobox', { name: 'Тип категории' })).toHaveTextContent('Доход');
  });

  it('offers archive when a category with transactions cannot be deleted', async () => {
    const data = mockBudgetApi();
    server.use(
      http.delete(`${apiUrl}/categories/2`, () =>
        HttpResponse.json(
          { message: 'Category is used by transactions and can only be archived' },
          { status: 409 },
        ),
      ),
    );
    renderWorkspace('/categories');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Удалить категорию Книги' }));
    await user.click(screen.getByRole('button', { name: 'Удалить' }));
    await user.click(await screen.findByRole('button', { name: 'Архивировать вместо удаления' }));
    expect(screen.getByRole('dialog', { name: 'Архивировать категорию?' })).toHaveTextContent(
      'История и существующие лимиты сохранятся',
    );
    await user.click(screen.getByRole('button', { name: 'Архивировать' }));
    expect(
      await screen.findByText('Категория архивирована. История операций сохранена.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Книги')).not.toBeInTheDocument());
    expect(
      data.requests.some(
        ({ method, path }) => method === 'PATCH' && path.endsWith('/categories/2/archive'),
      ),
    ).toBe(true);
    await user.click(screen.getByRole('switch', { name: 'Показывать архивные' }));
    expect(await screen.findByText('Книги')).toBeInTheDocument();
    expect(data.transactions).toHaveLength(1);
  });

  it('confirms deletion of an unused custom category and removes it from the list', async () => {
    const data = mockBudgetApi([]);
    renderWorkspace('/categories');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Удалить категорию Книги' }));
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(data.requests.some(({ method }) => method === 'DELETE')).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Удалить категорию Книги' }));
    await user.click(screen.getByRole('button', { name: 'Удалить' }));
    expect(await screen.findByText('Категория удалена.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Книги')).not.toBeInTheDocument());
  });

  it('disables destructive actions while the server is processing them', async () => {
    mockBudgetApi();
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    server.use(
      http.patch(`${apiUrl}/categories/2/archive`, async () => {
        await pending;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderWorkspace('/categories');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Архивировать категорию Книги' }));
    await user.click(screen.getByRole('button', { name: 'Архивировать' }));
    expect(await screen.findByRole('button', { name: 'Сохранение…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Отмена' })).toBeDisabled();
    await act(async () => {
      finish();
    });
    expect(
      await screen.findByText('Категория архивирована. История операций сохранена.'),
    ).toBeInTheDocument();
  });

  it('retries a failed category load', async () => {
    mockBudgetApi();
    let failed = true;
    server.use(
      http.get(`${apiUrl}/categories`, () =>
        failed ? new HttpResponse(null, { status: 500 }) : HttpResponse.json([]),
      ),
    );
    renderWorkspace('/categories');
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить категории');
    failed = false;
    await userEvent.setup().click(screen.getByRole('button', { name: 'Повторить' }));
    expect(
      await screen.findByText('Категорий пока нет. Создайте первую категорию.'),
    ).toBeInTheDocument();
  });

  it('has an accessible category form and displays field validation', async () => {
    mockBudgetApi();
    renderWorkspace('/categories');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Создать категорию' }));
    expect(
      (
        await axe.run(screen.getByRole('dialog'), {
          rules: { 'color-contrast': { enabled: false } },
        })
      ).violations,
    ).toEqual([]);
    await user.type(screen.getByLabelText('Название'), '   ');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByText('Введите название')).toBeInTheDocument();
    expect(screen.getByLabelText('Название')).toHaveAttribute('aria-invalid', 'true');
  });
});
