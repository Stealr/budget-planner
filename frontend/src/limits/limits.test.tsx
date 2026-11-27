import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderWorkspace } from '../test/workspace';
import { apiUrl, transactionFixture } from '../test/budgetApi';
import { limitFixture, mockLimitsApi } from '../test/limitsApi';
import { server } from '../test/server';

describe('monthly limits', () => {
  it('preserves the month in the URL and does not relabel old data during a pending month change', async () => {
    mockLimitsApi([limitFixture]);
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    server.use(
      http.get(`${apiUrl}/limits`, async ({ request }) => {
        if (new URL(request.url).searchParams.get('month') === '2026-10') {
          await pending;
          return HttpResponse.json([]);
        }
        return HttpResponse.json([limitFixture]);
      }),
    );
    const { router } = renderWorkspace('/limits?month=2026-11&view=budget');
    await screen.findByRole('article', { name: 'Лимит Еда' });
    fireEvent.change(screen.getByLabelText('Месяц'), { target: { value: '2026-10' } });
    expect(await screen.findByLabelText('Загрузка лимитов')).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Лимит Еда' })).not.toBeInTheDocument();
    expect(router.state.location.search).toBe('?month=2026-10&view=budget');
    await act(async () => {
      finish();
    });
    expect(
      await screen.findByText('На выбранный месяц лимиты пока не заданы.'),
    ).toBeInTheDocument();
    await act(async () => {
      await router.navigate(-1);
    });
    expect(await screen.findByRole('article', { name: 'Лимит Еда' })).toBeInTheDocument();
    expect(screen.getByLabelText('Месяц')).toHaveValue('2026-11');
  });

  it('refreshes server spending after editing and deleting an expense', async () => {
    const data = mockLimitsApi([], [transactionFixture]);
    server.use(
      http.get(`${apiUrl}/limits`, () =>
        HttpResponse.json([
          {
            ...limitFixture,
            categoryId: 2,
            categoryName: 'Книги',
            spentAmount: data.budget.transactions.reduce(
              (sum, transaction) => sum + transaction.amount,
              0,
            ),
          },
        ]),
      ),
    );
    const { router } = renderWorkspace('/limits?month=2026-11');
    expect(await screen.findByRole('article', { name: 'Лимит Книги' })).toHaveTextContent('450,50');
    await act(async () => {
      await router.navigate('/transactions');
    });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Редактировать операцию 11' }));
    await user.clear(screen.getByLabelText('Сумма, ₽'));
    await user.type(screen.getByLabelText('Сумма, ₽'), '800');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    await screen.findByText('Операция сохранена.');
    await act(async () => {
      await router.navigate('/limits?month=2026-11');
    });
    expect(await screen.findByRole('article', { name: 'Лимит Книги' })).toHaveTextContent('800,00');
    await act(async () => {
      await router.navigate('/transactions');
    });
    await user.click(await screen.findByRole('button', { name: 'Удалить операцию 11' }));
    await user.click(screen.getByRole('button', { name: 'Удалить' }));
    await screen.findByText('Операция удалена.');
    await act(async () => {
      await router.navigate('/limits?month=2026-11');
    });
    expect(await screen.findByRole('article', { name: 'Лимит Книги' })).toHaveTextContent(
      'Потрачено 0,00',
    );
  });

  it('deletes the confirmed month even when browser navigation changes the visible month', async () => {
    const data = mockLimitsApi([limitFixture, { ...limitFixture, month: '2026-10' }]);
    const { router } = renderWorkspace('/limits?month=2026-11');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Удалить лимит Еда' }));
    await act(async () => {
      await router.navigate('/limits?month=2026-10');
    });
    await user.click(screen.getByRole('button', { name: 'Удалить' }));
    await waitFor(() => expect(data.requests.some(({ method }) => method === 'DELETE')).toBe(true));
    expect(data.requests.find(({ method }) => method === 'DELETE')!.month).toBe('2026-11');
    expect(data.limits).toEqual([{ ...limitFixture, month: '2026-10' }]);
  });
});
