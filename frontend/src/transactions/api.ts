import { api } from '../store/api';

import type { CategoryType } from '../categories/api';

export type TransactionInput = {
  amount: number;
  type: CategoryType;
  categoryId: number;
  description: string;
  transactionDate: string;
};

export type LimitWarning = {
  categoryId: number;
  categoryName: string;
  month: string;
  limitAmount: number;
  spentAmount: number;
  usagePercent: number;
  level: 'NEAR_LIMIT' | 'EXCEEDED';
};

export type Transaction = Omit<TransactionInput, 'description'> & {
  id: number;
  description: string | null;
  categoryName: string;
  createdAt: string;
  limitWarning?: LimitWarning;
};

export type TransactionQuery = {
  page: number;
  type?: CategoryType;
  categoryId?: number;
  dateFrom?: string;
  dateTo?: string;
};

export const transactionPageSize = 20;
const dependentTags = ['Transactions', 'Dashboard', 'Limits'] as const;

const transactionsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getTransactions: build.query<
      { content: Transaction[]; totalElements: number },
      TransactionQuery
    >({
      query: ({ page, ...filters }) => {
        const params = new URLSearchParams({
          page: String(page),
          size: String(transactionPageSize),
        });
        for (const [key, value] of Object.entries(filters)) {
          if (value !== undefined) params.set(key, String(value));
        }
        params.append('sort', 'transactionDate,desc');
        params.append('sort', 'id,desc');
        return `v1/transactions?${params}`;
      },
      providesTags: ['Transactions'],
    }),
    createTransaction: build.mutation<Transaction, TransactionInput>({
      query: (body) => ({ url: 'v1/transactions', method: 'POST', body }),
      invalidatesTags: (_result, error) => (!error || error.status === 404 ? dependentTags : []),
    }),
    updateTransaction: build.mutation<Transaction, { id: number; body: TransactionInput }>({
      query: ({ id, body }) => ({ url: `v1/transactions/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, error) => (!error || error.status === 404 ? dependentTags : []),
    }),
    deleteTransaction: build.mutation<void, number>({
      query: (id) => ({ url: `v1/transactions/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, error) => (!error || error.status === 404 ? dependentTags : []),
    }),
  }),
});

export const {
  useGetTransactionsQuery,
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
} = transactionsApi;
