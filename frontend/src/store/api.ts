import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_API_BASE_URL || '/api' }),
  tagTypes: ['Session', 'Transactions', 'Categories', 'Dashboard', 'Limits', 'StatementPreview'],
  endpoints: () => ({}),
});
