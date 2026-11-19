import { cleanup, render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ThemeProvider } from '@mui/material';
import { afterEach } from 'vitest';
import App from '../App';
import { persistSession } from '../auth/session';
import { campusTheme } from '../theme';
import { createAppStore, type AppStore } from '../store/store';
import { api } from '../store/api';

const stores: AppStore[] = [];
afterEach(() => {
  cleanup();
  for (const store of stores.splice(0)) store.dispatch(api.util.resetApiState());
});

export function renderWorkspace(path: string) {
  persistSession({
    accessToken: 'workspace-test',
    tokenType: 'Bearer',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  });
  const store = createAppStore();
  stores.push(store);
  const router = createMemoryRouter([{ path: '*', element: <App /> }], { initialEntries: [path] });
  return {
    store,
    router,
    ...render(
      <Provider store={store}>
        <ThemeProvider theme={campusTheme}>
          <RouterProvider router={router} />
        </ThemeProvider>
      </Provider>,
    ),
  };
}
