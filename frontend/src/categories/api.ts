import { api } from '../store/api';

export type CategoryType = 'INCOME' | 'EXPENSE';

type CategoryInput = { name: string; type: CategoryType };
type Category = CategoryInput & { id: number };

const categoriesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCategories: build.query<Category[], void>({
      query: () => 'v1/categories',
      providesTags: ['Categories'],
    }),
    createCategory: build.mutation<Category, CategoryInput>({
      query: (body) => ({ url: 'v1/categories', method: 'POST', body }),
      invalidatesTags: (_result, error) => (error ? [] : ['Categories']),
    }),
  }),
});

export const { useGetCategoriesQuery, useCreateCategoryMutation } = categoriesApi;
