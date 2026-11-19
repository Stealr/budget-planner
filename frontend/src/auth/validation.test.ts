import { describe, expect, it } from 'vitest';
import { loginSchema, registrationSchema } from './validation';
import { safeReturnTo } from './returnTo';
import { readSession, sessionStorageKey } from './session';

describe('registration validation', () => {
  it.each(['short', 'я'.repeat(37), 'password\0', 'a'.repeat(73)])(
    'rejects an invalid password (%#)',
    (password) => {
      expect(registrationSchema.safeParse({ email: 'student@example.com', password }).success).toBe(
        false,
      );
    },
  );

  it('accepts the UTF-8 byte boundary and preserves spaces in the password', () => {
    const password = 'я'.repeat(36);
    expect(registrationSchema.parse({ email: ' student@example.com ', password }).password).toBe(
      password,
    );
    expect(
      registrationSchema.parse({ email: 'student@example.com', password: ' password ' }).password,
    ).toBe(' password ');
  });

  it('does not apply registration minimum length to existing credentials on login', () => {
    expect(loginSchema.safeParse({ email: 'student@example.com', password: 'short' }).success).toBe(
      true,
    );
  });
});

describe('internal return address', () => {
  it.each([
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '/login',
    '/register?from=/login',
    '/\n/evil.test',
    null,
  ])('rejects unsafe or looping destinations (%#)', (value) => {
    expect(safeReturnTo(value)).toBe('/');
  });

  it('preserves an internal path, filters and hash', () => {
    expect(safeReturnTo('/transactions?page=2#history')).toBe('/transactions?page=2#history');
  });
});

describe('session restoration', () => {
  it.each([
    'not-json',
    '{}',
    JSON.stringify({
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresAt: '2020-01-01T00:00:00Z',
    }),
  ])('discards malformed or expired storage (%#)', (value) => {
    sessionStorage.setItem(sessionStorageKey, value);
    expect(readSession()).toBeNull();
    expect(sessionStorage.getItem(sessionStorageKey)).toBeNull();
  });
});
