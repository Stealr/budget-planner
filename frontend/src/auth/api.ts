import { isExpired, isSession, type Session } from './session';

type Credentials = { email: string; password: string };
type RegisteredAccount = { id: number; email: string };

export class AuthError extends Error {
  constructor(public status: number | 'NETWORK_ERROR' | 'INVALID_RESPONSE') {
    super('Authentication request failed');
  }
}

// Credentials stay in the form and fetch call, outside Redux actions and RTK Query caches.
async function request(path: 'login' | 'register', credentials: Credentials, signal: AbortSignal) {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/v1/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      signal,
      cache: 'no-store',
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new AuthError('NETWORK_ERROR');
  }
  if (!response.ok) throw new AuthError(response.status);
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new AuthError('INVALID_RESPONSE');
  }
}

export async function login(credentials: Credentials, signal: AbortSignal): Promise<Session> {
  const result = await request('login', credentials, signal);
  if (!isSession(result) || isExpired(result)) throw new AuthError('INVALID_RESPONSE');
  return result;
}

export async function registerAccount(
  credentials: Credentials,
  signal: AbortSignal,
): Promise<RegisteredAccount> {
  const result = (await request(
    'register',
    credentials,
    signal,
  )) as Partial<RegisteredAccount> | null;
  if (!result || typeof result.id !== 'number' || typeof result.email !== 'string') {
    throw new AuthError('INVALID_RESPONSE');
  }
  return result as RegisteredAccount;
}

export function authErrorMessage(error: unknown, registration: boolean) {
  if (error instanceof AuthError) {
    if (error.status === 401) return 'Неверный email или пароль';
    if (error.status === 409 && registration) return 'Email уже занят';
    if (error.status === 400) return 'Проверьте email и пароль: сервер отклонил данные.';
    if (error.status === 'NETWORK_ERROR') {
      return 'Не удалось связаться с сервером. Проверьте соединение и попробуйте снова.';
    }
  }
  return 'Не удалось выполнить запрос. Попробуйте снова позже.';
}
