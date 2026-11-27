import { describe, expect, it } from 'vitest';
import { registrationSchema } from './validation';
import { safeReturnTo } from './returnTo';
import { readSession, sessionStorageKey } from './session';

describe('registration validation', () => {
  it.each(['short', 'я'.repeat(37)])('rejects an invalid password (%#)', (password) => {
    expect(registrationSchema.safeParse({ email: 'student@example.com', password }).success).toBe(
      false,
    );
  });

  it('accepts the UTF-8 byte boundary and preserves spaces in the password', () => {
    const password = 'я'.repeat(36);
    expect(registrationSchema.parse({ email: ' student@example.com ', password }).password).toBe(
      password,
    );
    expect(
      registrationSchema.parse({ email: 'student@example.com', password: ' password ' }).password,
    ).toBe(' password ');
  });
});

describe('internal return address', () => {
  it('rejects an external return address', () => {
    expect(safeReturnTo('https://evil.test')).toBe('/');
  });
});

describe('session restoration', () => {
  it('discards an expired session', () => {
    sessionStorage.setItem(
      sessionStorageKey,
      JSON.stringify({
        accessToken: 'token',
        tokenType: 'Bearer',
        expiresAt: '2020-01-01T00:00:00Z',
      }),
    );
    expect(readSession()).toBeNull();
    expect(sessionStorage.getItem(sessionStorageKey)).toBeNull();
  });
});
