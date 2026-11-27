import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderWorkspace } from '../test/workspace';
import { apiUrl, mockBudgetApi, transactionFixture } from '../test/budgetApi';
import { server } from '../test/server';

async function createExpense() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Добавить операцию' }));
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: 'Категория' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    ),
  );
  await user.click(screen.getByRole('combobox', { name: 'Категория' }));
  await user.click(await screen.findByRole('option', { name: 'Книги' }));
  await user.type(screen.getByLabelText('Сумма, ₽'), '10');
  fireEvent.change(screen.getByLabelText('Дата', { exact: true }), {
    target: { value: '2026-10-15' },
  });
  await user.click(screen.getByRole('button', { name: 'Сохранить' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

describe('warnings after saving an expense', () => {
  it('trusts EXCEEDED from the server even when usagePercent rounds to 100', async () => {
    mockBudgetApi([]);
    server.use(
      http.post(`${apiUrl}/transactions`, () =>
        HttpResponse.json(
          {
            ...transactionFixture,
            limitWarning: {
              categoryId: 2,
              categoryName: 'Книги',
              month: '2026-10',
              level: 'EXCEEDED',
              usagePercent: 100,
              spentAmount: 20000.01,
              limitAmount: 20000,
            },
          },
          { status: 201 },
        ),
      ),
    );
    renderWorkspace('/transactions');
    await createExpense();
    expect(await screen.findByText('Лимит превышен')).toBeInTheDocument();
    expect(screen.queryByText('Достигнут порог 80% лимита')).not.toBeInTheDocument();
  });
});
