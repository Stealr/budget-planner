import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { sessionEnded, type AuthState } from '../auth/authSlice';
import { isExpired } from '../auth/session';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  prepareHeaders: (headers, { getState }) => {
    const { session } = (getState() as { auth: AuthState }).auth;
    if (session) headers.set('Authorization', `Bearer ${session.accessToken}`);
    return headers;
  },
});

const authenticatedBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, queryApi, extraOptions) => {
  const getAuth = () => (queryApi.getState() as { auth: AuthState }).auth;
  const { session, generation } = getAuth();
  if (!session || isExpired(session)) {
    if (session) queryApi.dispatch(sessionEnded('expired'));
    return { error: { status: 401, data: { message: 'Authentication required' } } };
  }

  const result = await rawBaseQuery(args, queryApi, extraOptions);

  // A response from an earlier session must neither refill the cache nor expire a new session.
  if (getAuth().generation !== generation) {
    return { error: { status: 'CUSTOM_ERROR', error: 'Session changed' } };
  }
  if (result.error?.status === 401) queryApi.dispatch(sessionEnded('expired'));
  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: authenticatedBaseQuery,
  tagTypes: ['Session', 'Transactions', 'Categories', 'Dashboard', 'Limits', 'StatementPreview'],
  endpoints: () => ({}),
});
