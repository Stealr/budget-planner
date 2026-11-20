import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { renderWorkspace } from '../test/workspace';
import { apiUrl, transactionFixture } from '../test/budgetApi';
import { limitFixture, mockLimitsApi } from '../test/limitsApi';
import { server } from '../test/server';
import { today } from '../shared/format';

async function chooseCategory(name: string) {
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: 'Категория расходов' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    ),
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox', { name: 'Категория расходов' }));
  await user.click(await screen.findByRole('option', { name }));
}

describe('monthly limits', () => {
  it('defaults to the current month and displays server spending even without loaded transactions', async () => {
    const month = today().slice(0, 7);
    const data = mockLimitsApi([{ ...limitFixture, month }]);
    renderWorkspace('/limits');
    const card = await screen.findByRole('article', { name: 'Лимит Еда' });
    expect(card).toHaveTextContent('790,00');
    expect(card).toHaveTextContent('210,00');
    expect(card).toHaveTextContent('79%');
    expect(card).toHaveTextContent('В пределах лимита');
    expect(data.requests[0]).toEqual({ method: 'GET', month });
    expect(data.budget.requests.some(({ path }) => path.endsWith('/transactions'))).toBe(false);
  });

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

  it('does not send an invalid month from the URL and recovers after correction', async () => {
    const data = mockLimitsApi([limitFixture]);
    renderWorkspace('/limits?month=2026-13');
    expect(await screen.findByText(/В адресе указан некорректный месяц/)).toBeInTheDocument();
    expect(data.requests).toEqual([]);
    expect(screen.getByRole('button', { name: 'Задать лимит' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Месяц'), { target: { value: '2026-11' } });
    expect(await screen.findByRole('article', { name: 'Лимит Еда' })).toBeInTheDocument();
  });

  it('creates a limit in rubles for an active expense category', async () => {
    const data = mockLimitsApi();
    renderWorkspace('/limits?month=2026-11');
    const user = userEvent.setup();
    await screen.findByText('На выбранный месяц лимиты пока не заданы.');
    await user.click(screen.getByRole('button', { name: 'Задать лимит' }));
    await chooseCategory('Книги');
    await user.type(screen.getByLabelText('Лимит, ₽'), '5000,50');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByRole('article', { name: 'Лимит Книги' })).toHaveTextContent(
      '5 000,50',
    );
    expect(data.requests.find(({ method }) => method === 'PUT')).toEqual({
      method: 'PUT',
      month: '2026-11',
      categoryId: 2,
      body: { amount: 5000.5 },
    });
  });

  it('excludes income and archived categories and rejects a zero limit', async () => {
    const data = mockLimitsApi();
    renderWorkspace('/limits?month=2026-11');
    await screen.findByText('На выбранный месяц лимиты пока не заданы.');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Задать лимит' }));
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Категория расходов' })).not.toHaveAttribute(
        'aria-disabled',
        'true',
      ),
    );
    await user.click(screen.getByRole('combobox', { name: 'Категория расходов' }));
    expect(screen.queryByRole('option', { name: 'Стипендия' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Старые подписки' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Еда' }));
    await user.type(screen.getByLabelText('Лимит, ₽'), '0');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByText('Введите сумму больше нуля')).toBeInTheDocument();
    expect(data.requests.some(({ method }) => method === 'PUT')).toBe(false);
  });

  it('updates an existing limit without changing its month or category', async () => {
    const data = mockLimitsApi([limitFixture]);
    renderWorkspace('/limits?month=2026-11');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Изменить лимит Еда' }));
    expect(screen.getByRole('combobox', { name: 'Категория расходов' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await user.clear(screen.getByLabelText('Лимит, ₽'));
    await user.type(screen.getByLabelText('Лимит, ₽'), '2000');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() =>
      expect(screen.getByRole('article', { name: 'Лимит Еда' })).toHaveTextContent('2 000,00'),
    );
    expect(screen.getByRole('article', { name: 'Лимит Еда' })).toHaveTextContent('39,5%');
    expect(data.requests.find(({ method }) => method === 'PUT')!.categoryId).toBe(1);
  });

  it('warns before replacing a limit selected through the new-limit form', async () => {
    mockLimitsApi([limitFixture]);
    renderWorkspace('/limits?month=2026-11');
    await screen.findByRole('article', { name: 'Лимит Еда' });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Задать лимит' }));
    await chooseCategory('Еда');
    expect(
      await screen.findByText('Лимит для этой категории уже задан. Сохранение заменит его сумму.'),
    ).toBeInTheDocument();
  });

  it('keeps archived category limits readable and deletable with confirmation', async () => {
    const data = mockLimitsApi([
      { ...limitFixture, categoryId: 4, categoryName: 'Старые подписки' },
    ]);
    renderWorkspace('/limits?month=2026-11');
    const user = userEvent.setup();
    const card = await screen.findByRole('article', { name: 'Лимит Старые подписки' });
    expect(await within(card).findByText('Категория в архиве')).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: /Изменить/ })).not.toBeInTheDocument();
    await user.click(within(card).getByRole('button', { name: /Удалить/ }));
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(data.requests.some(({ method }) => method === 'DELETE')).toBe(false);
    await user.click(within(card).getByRole('button', { name: /Удалить/ }));
    await user.click(screen.getByRole('button', { name: 'Удалить' }));
    expect(
      await screen.findByText('На выбранный месяц лимиты пока не заданы.'),
    ).toBeInTheDocument();
    expect(data.requests.find(({ method }) => method === 'DELETE')).toEqual({
      method: 'DELETE',
      categoryId: 4,
      month: '2026-11',
    });
  });

  it('caps the bar at 100 but displays the actual excess and percent', async () => {
    mockLimitsApi([{ ...limitFixture, spentAmount: 1350 }]);
    renderWorkspace('/limits?month=2026-11');
    const card = await screen.findByRole('article', { name: 'Лимит Еда' });
    expect(within(card).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(within(card).getByRole('progressbar')).toHaveAttribute('aria-valuetext', '135% лимита');
    expect(card).toHaveTextContent('Превышение: 350,00');
    expect(card).toHaveTextContent('Лимит превышен');
  });

  it.each([400, 404, 409])('keeps input on a failed save (%s)', async (status) => {
    mockLimitsApi([limitFixture]);
    server.use(
      http.put(`${apiUrl}/limits/1`, () =>
        HttpResponse.json({ message: 'Limits require an active expense category' }, { status }),
      ),
    );
    renderWorkspace('/limits?month=2026-11');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Изменить лимит Еда' }));
    await user.clear(screen.getByLabelText('Лимит, ₽'));
    await user.type(screen.getByLabelText('Лимит, ₽'), '1234,56');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toBeInTheDocument();
    expect(screen.getByLabelText('Лимит, ₽')).toHaveValue('1234,56');
  });

  it('blocks duplicate submissions during saving', async () => {
    mockLimitsApi([limitFixture]);
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const handler = vi.fn(async () => {
      await pending;
      return HttpResponse.json(limitFixture);
    });
    server.use(http.put(`${apiUrl}/limits/1`, handler));
    renderWorkspace('/limits?month=2026-11');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Изменить лимит Еда' }));
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByRole('button', { name: 'Сохранение…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Отмена' })).toBeDisabled();
    expect(handler).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish();
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('retries a failed load', async () => {
    mockLimitsApi();
    let failed = true;
    server.use(
      http.get(`${apiUrl}/limits`, () =>
        failed ? new HttpResponse(null, { status: 500 }) : HttpResponse.json([]),
      ),
    );
    renderWorkspace('/limits?month=2026-11');
    expect(await screen.findByText('Не удалось загрузить лимиты.')).toBeInTheDocument();
    failed = false;
    await userEvent.setup().click(screen.getByRole('button', { name: 'Повторить' }));
    expect(
      await screen.findByText('На выбранный месяц лимиты пока не заданы.'),
    ).toBeInTheDocument();
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

  it('has accessible progress and a labelled limit form', async () => {
    mockLimitsApi([limitFixture]);
    renderWorkspace('/limits?month=2026-11');
    const card = await screen.findByRole('article', { name: 'Лимит Еда' });
    expect(
      (await axe.run(card, { rules: { 'color-contrast': { enabled: false } } })).violations,
    ).toEqual([]);
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Изменить лимит Еда' }));
    expect(
      (
        await axe.run(screen.getByRole('dialog'), {
          rules: { 'color-contrast': { enabled: false } },
        })
      ).violations,
    ).toEqual([]);
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

  it('can read and delete limits when category loading fails', async () => {
    mockLimitsApi([limitFixture]);
    server.use(http.get(`${apiUrl}/categories`, () => new HttpResponse(null, { status: 500 })));
    renderWorkspace('/limits?month=2026-11');
    const card = await screen.findByRole('article', { name: 'Лимит Еда' });
    await screen.findByText(
      'Не удалось загрузить категории. Лимиты доступны для просмотра и удаления.',
    );
    expect(card).toHaveTextContent('790,00');
    expect(
      within(card).queryByRole('button', { name: 'Изменить лимит Еда' }),
    ).not.toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(within(card).getByRole('button', { name: 'Удалить лимит Еда' }));
    await user.click(screen.getByRole('button', { name: 'Удалить' }));
    expect(
      await screen.findByText('На выбранный месяц лимиты пока не заданы.'),
    ).toBeInTheDocument();
  });

  it('refreshes monthly progress after adding a new expense', async () => {
    const data = mockLimitsApi();
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
    expect(await screen.findByRole('article', { name: 'Лимит Книги' })).toHaveTextContent(
      'Потрачено 0,00',
    );
    await act(async () => {
      await router.navigate('/transactions');
    });
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
    await user.type(screen.getByLabelText('Сумма, ₽'), '450,50');
    fireEvent.change(screen.getByLabelText('Дата', { exact: true }), {
      target: { value: '2026-11-20' },
    });
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await act(async () => {
      await router.navigate('/limits?month=2026-11');
    });
    expect(await screen.findByRole('article', { name: 'Лимит Книги' })).toHaveTextContent('450,50');
  });
});
