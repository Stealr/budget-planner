import { api } from '../store/api';
import type { MonthlyLimit } from './types';

type LimitAddress = { categoryId: number; month: string };
const affectedTags = ['Limits', 'Dashboard'] as const;

const limitsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getMonthlyLimits: build.query<MonthlyLimit[], string>({
      query: (month) => ({ url: 'v1/limits', params: { month } }),
      providesTags: ['Limits'],
    }),
    setMonthlyLimit: build.mutation<MonthlyLimit, LimitAddress & { amount: number }>({
      query: ({ categoryId, month, amount }) => ({
        url: `v1/limits/${categoryId}`,
        params: { month },
        method: 'PUT',
        body: { amount },
      }),
      invalidatesTags: (_result, error) => (!error || error.status === 404 ? affectedTags : []),
    }),
    deleteMonthlyLimit: build.mutation<void, LimitAddress>({
      query: ({ categoryId, month }) => ({
        url: `v1/limits/${categoryId}`,
        params: { month },
        method: 'DELETE',
      }),
      invalidatesTags: (_result, error) => (!error || error.status === 404 ? affectedTags : []),
    }),
  }),
});

export const {
  useGetMonthlyLimitsQuery,
  useSetMonthlyLimitMutation,
  useDeleteMonthlyLimitMutation,
} = limitsApi;
