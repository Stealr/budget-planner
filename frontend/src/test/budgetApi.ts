import { http, HttpResponse } from 'msw';
import type { Category, CategoryInput } from '../categories/api';
import type { Transaction, TransactionInput } from '../transactions/api';
import { server } from './server';

export const apiUrl = 'http://localhost:3000/api/v1';
const createdAt = '2026-11-19T00:00:00Z';
export const categoryFixtures: Category[] = [
  { id: 1, name: 'Еда', type: 'EXPENSE', standard: true, archivedAt: null, createdAt },
  { id: 2, name: 'Книги', type: 'EXPENSE', standard: false, archivedAt: null, createdAt },
  { id: 3, name: 'Стипендия', type: 'INCOME', standard: true, archivedAt: null, createdAt },
  {
    id: 4,
    name: 'Старые подписки',
    type: 'EXPENSE',
    standard: false,
    archivedAt: createdAt,
    createdAt,
  },
  {
    id: 5,
    name: 'Старый транспорт',
    type: 'EXPENSE',
    standard: false,
    archivedAt: createdAt,
    createdAt,
  },
];
export const transactionFixture: Transaction = {
  id: 11,
  amount: 450.5,
  type: 'EXPENSE',
  categoryId: 2,
  categoryName: 'Книги',
  transactionDate: '2026-11-19',
  description: 'Учебник',
  createdAt,
};

export function mockBudgetApi(initialTransactions: Transaction[] = [transactionFixture]) {
  const data = {
    categories: categoryFixtures.map((category) => ({ ...category })),
    transactions: initialTransactions.map((transaction) => ({ ...transaction })),
    requests: [] as { method: string; path: string; params: URLSearchParams; body?: unknown }[],
  };
  const log = (request: Request, body?: unknown) =>
    data.requests.push({
      method: request.method,
      path: new URL(request.url).pathname,
      params: new URL(request.url).searchParams,
      body,
    });
  server.use(
    http.get(`${apiUrl}/categories`, ({ request }) => {
      log(request);
      return HttpResponse.json(
        data.categories.filter(
          (category) =>
            !category.archivedAt ||
            new URL(request.url).searchParams.get('includeArchived') === 'true',
        ),
      );
    }),
    http.get(`${apiUrl}/transactions`, ({ request }) => {
      log(request);
      const params = new URL(request.url).searchParams;
      const page = Number(params.get('page') ?? 0);
      const filtered = data.transactions.filter(
        (transaction) =>
          (!params.get('type') || transaction.type === params.get('type')) &&
          (!params.get('categoryId') ||
            transaction.categoryId === Number(params.get('categoryId'))) &&
          (!params.get('dateFrom') || transaction.transactionDate >= params.get('dateFrom')!) &&
          (!params.get('dateTo') || transaction.transactionDate <= params.get('dateTo')!),
      );
      return HttpResponse.json({
        content: filtered.slice(page * 20, (page + 1) * 20).map((transaction) => ({
          ...transaction,
          categoryName:
            data.categories.find((category) => category.id === transaction.categoryId)?.name ??
            transaction.categoryName,
        })),
        totalElements: filtered.length,
      });
    }),
    http.post(`${apiUrl}/transactions`, async ({ request }) => {
      const body = (await request.json()) as TransactionInput;
      log(request, body);
      const transaction = {
        ...body,
        id: 100,
        categoryName: data.categories.find((category) => category.id === body.categoryId)!.name,
        createdAt,
      };
      data.transactions.unshift(transaction);
      return HttpResponse.json(transaction, { status: 201 });
    }),
    http.put(`${apiUrl}/transactions/:id`, async ({ request, params }) => {
      const body = (await request.json()) as TransactionInput;
      log(request, body);
      const index = data.transactions.findIndex(({ id }) => id === Number(params.id));
      const transaction = { ...data.transactions[index], ...body };
      data.transactions[index] = transaction;
      return HttpResponse.json(transaction);
    }),
    http.delete(`${apiUrl}/transactions/:id`, ({ request, params }) => {
      log(request);
      data.transactions = data.transactions.filter(({ id }) => id !== Number(params.id));
      return new HttpResponse(null, { status: 204 });
    }),
    http.post(`${apiUrl}/categories`, async ({ request }) => {
      const body = (await request.json()) as CategoryInput;
      log(request, body);
      const category = { ...body, id: 100, standard: false, archivedAt: null, createdAt };
      data.categories.push(category);
      return HttpResponse.json(category, { status: 201 });
    }),
    http.put(`${apiUrl}/categories/:id`, async ({ request, params }) => {
      const body = (await request.json()) as CategoryInput;
      log(request, body);
      const category = data.categories.find(({ id }) => id === Number(params.id))!;
      Object.assign(category, body);
      return HttpResponse.json(category);
    }),
    http.patch(`${apiUrl}/categories/:id/archive`, ({ request, params }) => {
      log(request);
      data.categories.find(({ id }) => id === Number(params.id))!.archivedAt = createdAt;
      return new HttpResponse(null, { status: 204 });
    }),
    http.delete(`${apiUrl}/categories/:id`, ({ request, params }) => {
      log(request);
      data.categories = data.categories.filter(({ id }) => id !== Number(params.id));
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return data;
}
