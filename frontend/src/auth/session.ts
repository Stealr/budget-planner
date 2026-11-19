export type Session = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
};

export const sessionStorageKey = 'studbudget.session';

export function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<Session>;
  return (
    typeof session.accessToken === 'string' &&
    session.accessToken.length > 0 &&
    Array.from(session.accessToken).every((character) => {
      const code = character.charCodeAt(0);
      return code > 32 && code < 127;
    }) &&
    session.tokenType === 'Bearer' &&
    typeof session.expiresAt === 'string' &&
    Number.isFinite(Date.parse(session.expiresAt))
  );
}

export function isExpired(session: Session) {
  return Date.parse(session.expiresAt) <= Date.now();
}

export function readSession(): Session | null {
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(sessionStorageKey) ?? 'null');
    if (isSession(stored) && !isExpired(stored)) return stored;
  } catch {
    // Storage may be unavailable or contain malformed data. Start without a session.
  }
  persistSession(null);
  return null;
}

export function persistSession(session: Session | null) {
  try {
    if (session) sessionStorage.setItem(sessionStorageKey, JSON.stringify(session));
    else sessionStorage.removeItem(sessionStorageKey);
  } catch {
    // With storage disabled, the session lasts until the page is reloaded.
  }
}
