export function safeReturnTo(value: unknown) {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    Array.from(value).some((character) => character.charCodeAt(0) <= 32)
  ) {
    return '/';
  }
  const base = 'https://studbudget.invalid';
  const url = new URL(value, base);
  if (url.origin !== base || /^\/(login|register)\/?$/.test(url.pathname)) return '/';
  return url.pathname + url.search + url.hash;
}
