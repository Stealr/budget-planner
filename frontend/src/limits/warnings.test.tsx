import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import axe from 'axe-core';
import { renderWorkspace } from '../test/workspace';
import { apiUrl, mockBudgetApi, transactionFixture } from '../test/budgetApi';
import { server } from '../test/server';
import type { TransactionInput } from '../transactions/api';
import type { LimitWarning } from './types';

function warning(level: LimitWarning['level'], usagePercent: number): LimitWarning {
  return {
    categoryId: 2,
    categoryName: 'Книги',
    month: '2026-10',
    limitAmount: 1000,
    spentAmount: usagePercent * 10,
    usagePercent,
    level,
  };
}

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
  return user;
}

describe('warnings after saving an expense', () => {
  it.each([
    [79, null, null],
    [80, 'NEAR_LIMIT', 'Достигнут порог 80% лимита'],
    [100, 'NEAR_LIMIT', 'Достигнут порог 80% лимита'],
    [101, 'EXCEEDED', 'Лимит превышен'],
  ] as const)(
    'shows the server result at %s%% outside the closed form',
    async (percent, level, title) => {
      mockBudgetApi([]);
      server.use(
        http.post(`${apiUrl}/transactions`, async ({ request }) => {
          const body = (await request.json()) as TransactionInput;
          expect(body.transactionDate).toBe('2026-10-15');
          return HttpResponse.json(
            {
              ...transactionFixture,
              ...body,
              ...(level ? { limitWarning: warning(level, percent) } : {}),
            },
            { status: 201 },
          );
        }),
      );
      renderWorkspace('/transactions');
      const user = await createExpense();
      if (title) {
        const alert = (await screen.findByText(title)).closest('[role="alert"]')!;
        expect(alert).toHaveTextContent('Книги');
        expect(alert).toHaveTextContent('октябрь 2026');
        expect(alert).toHaveTextContent(`${percent}%`);
        expect(
          (await axe.run(alert, { rules: { 'color-contrast': { enabled: false } } })).violations,
        ).toEqual([]);
        await user.click(screen.getByRole('button', { name: 'Закрыть предупреждение' }));
        expect(screen.queryByText(title)).not.toBeInTheDocument();
      } else {
        expect(screen.queryByText('Достигнут порог 80% лимита')).not.toBeInTheDocument();
        expect(screen.queryByText('Лимит превышен')).not.toBeInTheDocument();
      }
    },
  );

  it('trusts EXCEEDED from the server even when usagePercent rounds to 100', async () => {
    mockBudgetApi([]);
    server.use(
      http.post(`${apiUrl}/transactions`, () =>
        HttpResponse.json(
          {
            ...transactionFixture,
            limitWarning: {
              ...warning('EXCEEDED', 100),
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

  it('does not carry a previous warning into an edited transaction', async () => {
    const data = mockBudgetApi([]);
    server.use(
      http.post(`${apiUrl}/transactions`, async ({ request }) => {
        const body = (await request.json()) as TransactionInput;
        const transaction = { ...transactionFixture, ...body, id: 100 };
        data.transactions.push(transaction);
        return HttpResponse.json(
          { ...transaction, limitWarning: warning('NEAR_LIMIT', 80) },
          { status: 201 },
        );
      }),
    );
    renderWorkspace('/transactions');
    const user = await createExpense();
    expect(await screen.findByText('Достигнут порог 80% лимита')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Редактировать операцию 100' }));
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByText('Операция сохранена.')).toBeInTheDocument();
    expect(screen.queryByText('Достигнут порог 80% лимита')).not.toBeInTheDocument();
  });

  it('does not show an expense warning for an income', async () => {
    mockBudgetApi([]);
    server.use(
      http.post(`${apiUrl}/transactions`, async ({ request }) =>
        HttpResponse.json(
          {
            ...transactionFixture,
            ...((await request.json()) as TransactionInput),
            limitWarning: warning('NEAR_LIMIT', 80),
          },
          { status: 201 },
        ),
      ),
    );
    renderWorkspace('/transactions');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Добавить операцию' }));
    await user.click(screen.getByRole('combobox', { name: 'Тип операции' }));
    await user.click(await screen.findByRole('option', { name: 'Доход' }));
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Категория' })).not.toHaveAttribute(
        'aria-disabled',
        'true',
      ),
    );
    await user.click(screen.getByRole('combobox', { name: 'Категория' }));
    await user.click(await screen.findByRole('option', { name: 'Стипендия' }));
    await user.type(screen.getByLabelText('Сумма, ₽'), '5000');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText('Достигнут порог 80% лимита')).not.toBeInTheDocument();
  });
});
