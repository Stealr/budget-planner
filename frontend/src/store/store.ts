import { configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { api } from './api';
import { navigationReducer } from './navigationSlice';
import { closeMobileMenu } from './navigationSlice';
import { authReducer, sessionEnded, sessionStarted } from '../auth/authSlice';
import { persistSession, readSession } from '../auth/session';

export function createAppStore() {
  const sessionListener = createListenerMiddleware();
  const appStore = configureStore({
    reducer: {
      auth: authReducer,
      navigation: navigationReducer,
      [api.reducerPath]: api.reducer,
    },
    preloadedState: {
      auth: { session: readSession(), generation: 0, reason: null },
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(sessionListener.middleware).concat(api.middleware),
  });

  sessionListener.startListening({
    matcher: isAnyOf(sessionStarted, sessionEnded),
    effect: () => {
      persistSession(appStore.getState().auth.session);
      for (const request of appStore.dispatch(api.util.getRunningQueriesThunk())) request.abort();
      for (const request of appStore.dispatch(api.util.getRunningMutationsThunk())) request.abort();
      appStore.dispatch(api.util.resetApiState());
      appStore.dispatch(closeMobileMenu());
    },
  });
  return appStore;
}

export const store = createAppStore();

setupListeners(store.dispatch);

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
