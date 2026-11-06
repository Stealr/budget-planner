import { api } from '../store/api';

import type { CategoryType } from '../categories/api';

type TransactionInput = {
  amount: number;
  type: CategoryType;
  categoryId: number;
  description: string;
  transactionDate: string;
};

type Transaction = Omit<TransactionInput, 'description'> & {
  id: number;
  description: string | null;
};

const transactionsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getTransactions: build.query<{ content: Transaction[]; totalElements: number }, number>({
      query: (page) => ({ url: 'v1/transactions', params: { page, size: 20, sort: 'id,desc' } }),
      providesTags: ['Transactions'],
    }),
    createTransaction: build.mutation<Transaction, TransactionInput>({
      query: (body) => ({ url: 'v1/transactions', method: 'POST', body }),
      invalidatesTags: (_result, error) => (error ? [] : ['Transactions', 'Dashboard', 'Limits']),
    }),
  }),
});

export const { useGetTransactionsQuery, useCreateTransactionMutation } = transactionsApi;
