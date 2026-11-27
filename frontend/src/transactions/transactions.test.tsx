import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderWorkspace } from '../test/workspace';
import { apiUrl, mockBudgetApi, transactionFixture } from '../test/budgetApi';
import { server } from '../test/server';

async function select(label: string, option: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

describe('operations and history', () => {
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

  it('preserves form values when the selected category is archived before saving', async () => {
    mockBudgetApi();
    server.use(
      http.put(`${apiUrl}/transactions/11`, () =>
        HttpResponse.json({ message: 'Cannot assign an archived category' }, { status: 409 }),
      ),
    );
    renderWorkspace('/transactions');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Редактировать операцию 11' }));
    await user.clear(screen.getByLabelText('Сумма, ₽'));
    await user.type(screen.getByLabelText('Сумма, ₽'), '99,99');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(
      await screen.findByText('Категория архивирована. Выберите активную категорию.'),
    ).toBeInTheDocument();
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
});
