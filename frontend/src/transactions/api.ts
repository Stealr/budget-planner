import { api } from '../store/api';

export type TransactionType = 'INCOME' | 'EXPENSE';

type Category = {
  id: number;
  name: string;
  type: TransactionType;
};

type TransactionInput = {
  amount: number;
  type: TransactionType;
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
    getCategories: build.query<Category[], void>({
      query: () => 'v1/categories',
      providesTags: ['Categories'],
    }),
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

export const { useGetCategoriesQuery, useGetTransactionsQuery, useCreateTransactionMutation } =
  transactionsApi;
