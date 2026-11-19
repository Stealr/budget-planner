import { http, HttpResponse } from 'msw';
import type { MonthlyLimit } from '../limits/types';
import type { Transaction } from '../transactions/api';
import { apiUrl, mockBudgetApi } from './budgetApi';
import { server } from './server';

export const limitFixture: MonthlyLimit = {
  categoryId: 1,
  categoryName: 'Еда',
  month: '2026-11',
  limitAmount: 1000,
  spentAmount: 790,
};

export function mockLimitsApi(
  initialLimits: MonthlyLimit[] = [],
  transactions: Transaction[] = [],
) {
  const data = {
    budget: mockBudgetApi(transactions),
    limits: initialLimits.map((limit) => ({ ...limit })),
    requests: [] as { method: string; month: string | null; categoryId?: number; body?: unknown }[],
  };
  server.use(
    http.get(`${apiUrl}/limits`, ({ request }) => {
      const month = new URL(request.url).searchParams.get('month');
      data.requests.push({ method: 'GET', month });
      return HttpResponse.json(data.limits.filter((limit) => limit.month === month));
    }),
    http.put(`${apiUrl}/limits/:categoryId`, async ({ request, params }) => {
      const month = new URL(request.url).searchParams.get('month')!;
      const body = (await request.json()) as { amount: number };
      const categoryId = Number(params.categoryId);
      data.requests.push({ method: 'PUT', month, categoryId, body });
      const index = data.limits.findIndex(
        (limit) => limit.categoryId === categoryId && limit.month === month,
      );
      const result = {
        categoryId,
        month,
        limitAmount: body.amount,
        categoryName: data.budget.categories.find((category) => category.id === categoryId)!.name,
        spentAmount: index < 0 ? 0 : data.limits[index].spentAmount,
      };
      if (index < 0) data.limits.push(result);
      else data.limits[index] = result;
      return HttpResponse.json(result);
    }),
    http.delete(`${apiUrl}/limits/:categoryId`, ({ request, params }) => {
      const month = new URL(request.url).searchParams.get('month');
      const categoryId = Number(params.categoryId);
      data.requests.push({ method: 'DELETE', month, categoryId });
      data.limits = data.limits.filter(
        (limit) => limit.month !== month || limit.categoryId !== categoryId,
      );
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return data;
}
