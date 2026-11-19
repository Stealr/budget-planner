import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ThemeProvider } from '@mui/material';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import App from '../App';
import { campusTheme } from '../theme';
import { createAppStore, type AppStore } from '../store/store';
import { api } from '../store/api';
import { server } from '../test/server';
import { sessionEnded, sessionStarted } from './authSlice';
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

  it('registers and opens login with the returned email, without persisting the password', async () => {
    server.use(
      http.post(`${apiUrl}/auth/register`, async ({ request }) => {
        expect(await request.json()).toEqual({
          email: 'student@example.com',
          password: ' password123 ',
        });
        return HttpResponse.json({ id: 1, email: 'student@example.com' }, { status: 201 });
      }),
    );
    const { store } = renderApp('/register');
    const user = await enterCredentials(' password123 ', 'Student@Example.com');
    await user.click(screen.getByRole('button', { name: 'Создать аккаунт' }));
    expect(await screen.findByText('Аккаунт создан. Войдите с вашим паролем.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('student@example.com');
    expect(screen.getByLabelText(/^Пароль/)).toHaveValue('');
    expect(store.getState().auth.session).toBeNull();
    expect(JSON.stringify(store.getState())).not.toContain('password123');
    expect(sessionStorage.getItem(sessionStorageKey)).toBeNull();
  });

  it.each([
    ['/login', 401, 'Неверный email или пароль', 'Войти'],
    ['/register', 409, 'Email уже занят', 'Создать аккаунт'],
    ['/register', 400, 'Проверьте email и пароль: сервер отклонил данные.', 'Создать аккаунт'],
  ])('shows a useful error for %s (%s)', async (path, status, message, button) => {
    server.use(
      http.post(`${apiUrl}/auth/${path === '/login' ? 'login' : 'register'}`, () =>
        HttpResponse.json(
          { timestamp: '2026-11-19T00:00:00Z', status, message: 'Internal details', path },
          { status },
        ),
      ),
    );
    const { router } = renderApp(path);
    const user = await enterCredentials();
    await user.click(screen.getByRole('button', { name: button }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(router.state.location.pathname).toBe(path);
    expect(screen.getByLabelText(/^Пароль/)).toHaveValue('password123');
    expect(screen.queryByText('Internal details')).not.toBeInTheDocument();
  });

  it('keeps the form usable after a network error', async () => {
    server.use(http.post(`${apiUrl}/auth/login`, () => HttpResponse.error()));
    renderApp();
    const user = await enterCredentials();
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось связаться с сервером');
    expect(screen.getByRole('button', { name: 'Войти' })).toBeEnabled();
  });

  it('blocks duplicate submits while login is pending', async () => {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const handler = vi.fn(async () => {
      await pending;
      return HttpResponse.json(session());
    });
    server.use(http.post(`${apiUrl}/auth/login`, handler));
    renderApp();
    const user = await enterCredentials();
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(await screen.findByRole('button', { name: 'Отправка…' })).toBeDisabled();
    expect(handler).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish();
    });
    expect(await screen.findByRole('heading', { name: 'Дашборд' })).toBeInTheDocument();
  });

  it.each(['/login', '/register'])('has accessible fields and feedback on %s', async (path) => {
    const { container } = renderApp(path);
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations).toEqual([]);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: path === '/login' ? 'Войти' : 'Создать аккаунт' }),
    );
    expect(await screen.findByText('Введите корректный email')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Пароль/)).toHaveAttribute('aria-invalid', 'true');
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

  it('expires an open session even without an API request', async () => {
    persistSession(session());
    const { store } = renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Дашборд' })).toBeInTheDocument();
    act(() => {
      store.dispatch(
        sessionStarted({ ...session(), expiresAt: new Date(Date.now() - 1).toISOString() }),
      );
    });
    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
    expect(sessionStorage.getItem(sessionStorageKey)).toBeNull();
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

  it.each([200, 401])(
    'ignores a delayed response (%s) from the previous account',
    async (status) => {
      persistSession(session());
      let finish!: () => void;
      let markStarted!: () => void;
      let markFinished!: () => void;
      const pending = new Promise<void>((resolve) => {
        finish = resolve;
      });
      const started = new Promise<void>((resolve) => {
        markStarted = resolve;
      });
      const finished = new Promise<void>((resolve) => {
        markFinished = resolve;
      });
      server.use(
        http.get(`${apiUrl}/categories`, async ({ request }) => {
          if (request.headers.get('Authorization') === 'Bearer account-one') {
            markStarted();
            await pending;
            markFinished();
            return HttpResponse.json([{ id: 1, name: 'Чужая категория', type: 'EXPENSE' }], {
              status,
            });
          }
          return HttpResponse.json([{ id: 2, name: 'Моя категория', type: 'EXPENSE' }]);
        }),
        http.post(`${apiUrl}/auth/login`, () => HttpResponse.json(session('account-two'))),
      );
      const { store } = renderApp('/categories');
      await started;
      act(() => {
        store.dispatch(sessionEnded('logout'));
      });
      expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
      const user = await enterCredentials('password123', 'second@example.com');
      await user.click(screen.getByRole('button', { name: 'Войти' }));
      expect(await screen.findByText('Моя категория')).toBeInTheDocument();
      await act(async () => {
        finish();
        await finished;
      });
      expect(screen.queryByText('Чужая категория')).not.toBeInTheDocument();
      expect(JSON.stringify(store.getState())).not.toContain('Чужая категория');
      expect(store.getState().auth.session?.accessToken).toBe('account-two');
    },
  );

  it('makes logout available in the mobile menu', async () => {
    persistSession(session());
    renderApp('/');
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Дашборд' });
    // JSDOM does not render a mobile viewport; check the menu's behavior by its label.
    await user.click(screen.getByLabelText('Открыть меню'));
    const drawer = screen.getByRole('presentation', { hidden: true });
    await user.click(within(drawer).getByRole('button', { name: 'Выйти', hidden: true }));
    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
  });
});
