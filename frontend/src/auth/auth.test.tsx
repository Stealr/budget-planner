import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ThemeProvider } from '@mui/material';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { campusTheme } from '../theme';
import { createAppStore, type AppStore } from '../store/store';
import { api } from '../store/api';
import { server } from '../test/server';
import { persistSession, sessionStorageKey, type Session } from './session';

const apiUrl = 'http://localhost:3000/api/v1';
const stores: AppStore[] = [];
const session = (token = 'account-one'): Session => ({
  accessToken: token,
  tokenType: 'Bearer',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
});

function renderApp(path = '/login') {
  const store = createAppStore();
  stores.push(store);
  const router = createMemoryRouter([{ path: '*', element: <App /> }], { initialEntries: [path] });
  const rendered = render(
    <Provider store={store}>
      <ThemeProvider theme={campusTheme}>
        <RouterProvider router={router} />
      </ThemeProvider>
    </Provider>,
  );
  return { store, router, ...rendered };
}

async function enterCredentials(password = 'password123', email = 'student@example.com') {
  const user = userEvent.setup();
  const emailInput = screen.getByRole('textbox', { name: 'Email' });
  await user.clear(emailInput);
  await user.type(emailInput, email);
  await user.type(screen.getByLabelText(/^Пароль/), password);
  return user;
}

afterEach(() => {
  cleanup();
  for (const store of stores.splice(0)) store.dispatch(api.util.resetApiState());
});

describe('account forms and protected navigation', () => {
  it('requires login without fetching protected data and returns to the original address', async () => {
    const protectedRequest = vi.fn(() => HttpResponse.json([]));
    server.use(
      http.get(`${apiUrl}/categories`, protectedRequest),
      http.post(`${apiUrl}/auth/login`, async ({ request }) => {
        expect(request.headers.has('Authorization')).toBe(false);
        expect(await request.json()).toEqual({
          email: 'student@example.com',
          password: 'password123',
        });
        return HttpResponse.json(session());
      }),
    );
    const { router, store } = renderApp('/categories?includeArchived=true#list');
    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
    expect(protectedRequest).not.toHaveBeenCalled();
    const user = await enterCredentials();
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(await screen.findByRole('heading', { name: 'Категории' })).toBeInTheDocument();
    expect(
      router.state.location.pathname + router.state.location.search + router.state.location.hash,
    ).toBe('/categories?includeArchived=true#list');
    await waitFor(() => expect(protectedRequest).toHaveBeenCalled());
    expect(JSON.stringify(store.getState())).not.toContain('password123');
    expect(sessionStorage.getItem(sessionStorageKey)).toContain('account-one');
  });
});

describe('session lifecycle', () => {
  it('restores the session before the first protected request and sends Bearer', async () => {
    persistSession(session());
    server.use(
      http.get(`${apiUrl}/categories`, ({ request }) => {
        expect(request.headers.get('Authorization')).toBe('Bearer account-one');
        return HttpResponse.json([{ id: 1, name: 'Категория аккаунта', type: 'EXPENSE' }]);
      }),
    );
    const { router } = renderApp('/categories');
    expect(await screen.findByText('Категория аккаунта')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/categories');
  });

  it('clears storage and protected cache on a 401', async () => {
    persistSession(session());
    server.use(http.get(`${apiUrl}/categories`, () => new HttpResponse(null, { status: 401 })));
    const { store } = renderApp('/categories');
    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
    expect(screen.getByText('Сессия истекла. Войдите снова.')).toBeInTheDocument();
    expect(sessionStorage.getItem(sessionStorageKey)).toBeNull();
    expect(store.getState().api.queries).toEqual({});
  });

  it('logs out through desktop navigation and clears cached data', async () => {
    persistSession(session());
    server.use(
      http.get(`${apiUrl}/categories`, () =>
        HttpResponse.json([{ id: 1, name: 'Личная категория', type: 'EXPENSE' }]),
      ),
    );
    const { store } = renderApp('/categories');
    expect(await screen.findByText('Личная категория')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Выйти' }));
    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
    expect(screen.queryByText('Личная категория')).not.toBeInTheDocument();
    expect(store.getState().api.queries).toEqual({});
    expect(sessionStorage.getItem(sessionStorageKey)).toBeNull();
  });
});
