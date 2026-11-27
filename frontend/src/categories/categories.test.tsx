import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import axe from 'axe-core';
import { renderWorkspace } from '../test/workspace';
import { apiUrl, mockBudgetApi } from '../test/budgetApi';
import { server } from '../test/server';

describe('category management', () => {
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
});
