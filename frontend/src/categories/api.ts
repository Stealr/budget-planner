import { api } from '../store/api';

export type CategoryType = 'INCOME' | 'EXPENSE';

export type CategoryInput = { name: string; type: CategoryType };
export type Category = CategoryInput & {
  id: number;
  createdAt: string;
  standard: boolean;
  archivedAt: string | null;
};

const dependentTags = ['Categories', 'Transactions', 'Dashboard', 'Limits'] as const;

const categoriesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCategories: build.query<Category[], boolean | void>({
      query: (includeArchived = false) => ({
        url: 'v1/categories',
        params: { includeArchived },
      }),
      providesTags: ['Categories'],
    }),
    createCategory: build.mutation<Category, CategoryInput>({
      query: (body) => ({ url: 'v1/categories', method: 'POST', body }),
      invalidatesTags: (_result, error) => (error ? [] : ['Categories']),
    }),
    updateCategory: build.mutation<Category, { id: number; body: CategoryInput }>({
      query: ({ id, body }) => ({ url: `v1/categories/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, error) => (!error || error.status === 404 ? dependentTags : []),
    }),
    archiveCategory: build.mutation<void, number>({
      query: (id) => ({ url: `v1/categories/${id}/archive`, method: 'PATCH' }),
      invalidatesTags: (_result, error) => (!error || error.status === 404 ? dependentTags : []),
    }),
    deleteCategory: build.mutation<void, number>({
      query: (id) => ({ url: `v1/categories/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, error) => (!error || error.status === 404 ? dependentTags : []),
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useArchiveCategoryMutation,
  useDeleteCategoryMutation,
} = categoriesApi;
