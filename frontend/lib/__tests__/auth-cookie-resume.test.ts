/**
 * Browser sessions are owned by the server: access and refresh JWTs are
 * httpOnly, so the client resumes by asking the refresh endpoint to rotate the
 * cookies. These tests pin down that boundary and the CSRF header it requires.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.NEXT_PUBLIC_API_URL = 'http://api.test';

import { apiFetch, clearTokens, hasTokens, login, restoreAuthCookies } from '../api-client';

const SESSION_COOKIE = 'npa_ecm_session';
const CSRF_COOKIE = 'npa_ecm_csrf_token';

const readCookie = (name: string) =>
  document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=') ?? null;

const setCookie = (name: string, value: string) => {
  document.cookie = `${name}=${value}; path=/; samesite=lax`;
};

const expireCookie = (name: string) => {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
};

const installStorage = (): Storage => {
  const map = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, value),
  };
  Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
  return storage;
};

describe('httpOnly cookie sessions', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = installStorage();
    expireCookie(SESSION_COOKIE);
    expireCookie(CSRF_COOKIE);
  });

  afterEach(() => {
    clearTokens();
    vi.unstubAllGlobals();
  });

  it('reports a session from the readable marker, never a JWT', () => {
    expect(hasTokens()).toBe(false);
    setCookie(SESSION_COOKIE, '1');
    expect(hasTokens()).toBe(true);
  });

  it('refreshes through the cookie endpoint with the CSRF header', async () => {
    setCookie(SESSION_COOKIE, '1');
    setCookie(CSRF_COOKIE, 'csrf-value');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await expect(restoreAuthCookies()).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/accounts/auth/token/refresh/');
    expect(init.credentials).toBe('include');
    expect(new Headers(init.headers).get('X-CSRF-Token')).toBe('csrf-value');
    expect(storage.getItem('access_token')).toBeNull();
    expect(storage.getItem('refresh_token')).toBeNull();
  });

  it('clears the readable session when the refresh is rejected', async () => {
    setCookie(SESSION_COOKIE, '1');
    setCookie(CSRF_COOKIE, 'csrf-value');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    await expect(restoreAuthCookies()).resolves.toBe(false);

    expect(readCookie(SESSION_COOKIE)).toBeNull();
    expect(readCookie(CSRF_COOKIE)).toBeNull();
  });

  it('does not keep a JS-visible copy of the session on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    await expect(restoreAuthCookies()).resolves.toBe(false);

    expect(storage.length).toBe(0);
  });

  it('does not persist login tokens in browser storage', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ detail: 'Signed in.' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await login('user', 'password');

    expect(storage.length).toBe(0);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.credentials).toBe('include');
  });

  it('sends the CSRF header instead of a bearer token on API calls', async () => {
    setCookie(SESSION_COOKIE, '1');
    setCookie(CSRF_COOKIE, 'csrf-value');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/secure', { method: 'POST', body: JSON.stringify({}) });

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get('X-CSRF-Token')).toBe('csrf-value');
    expect(headers.get('Authorization')).toBeNull();
    expect(init.credentials).toBe('include');
  });
});
