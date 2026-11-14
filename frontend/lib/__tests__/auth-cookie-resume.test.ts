/**
 * The proxy gates routes on the auth cookie, while a session only refreshes
 * tokens in localStorage. Without a resync, an expired cookie silently bounces
 * a signed-in user to /login on every deep link — the login page now resumes
 * via restoreAuthCookies(), which these tests pin down.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.NEXT_PUBLIC_API_URL = 'http://api.test';

import { clearTokens, restoreAuthCookies } from '../api-client';

const ACCESS_COOKIE = 'npa_ecm_access_token';
const REFRESH_COOKIE = 'npa_ecm_refresh_token';

const readCookie = (name: string) =>
  document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=') ?? null;

const expireCookie = (name: string) => {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
};

/** jsdom in this setup exposes cookies but no Storage; install our own. */
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

describe('restoreAuthCookies', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = installStorage();
    expireCookie(ACCESS_COOKIE);
    expireCookie(REFRESH_COOKIE);
  });

  afterEach(() => {
    clearTokens();
    vi.unstubAllGlobals();
  });

  const seedSession = (accessExpiresAt: number) => {
    storage.setItem('access_token', 'stored-access');
    storage.setItem('refresh_token', 'stored-refresh');
    storage.setItem('access_token_exp', String(accessExpiresAt));
  };

  it('re-writes the cookie a signed-in session lost', async () => {
    seedSession(Date.now() + 60 * 60 * 1000);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(restoreAuthCookies()).resolves.toBe(true);

    // This is exactly what proxy.ts reads.
    expect(readCookie(ACCESS_COOKIE)).toBe('stored-access');
    expect(readCookie(REFRESH_COOKIE)).toBe('stored-refresh');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refreshes an expired token before reporting the session usable', async () => {
    seedSession(Date.now() - 60 * 1000);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access: 'refreshed-access', refresh: 'refreshed-refresh', expires_in: 3600 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(restoreAuthCookies()).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/accounts/auth/token/refresh/');
    expect(readCookie(ACCESS_COOKIE)).toBe('refreshed-access');
    expect(storage.getItem('access_token')).toBe('refreshed-access');
  });

  it('reports failure when the refresh token is rejected', async () => {
    seedSession(Date.now() - 60 * 1000);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));

    await expect(restoreAuthCookies()).resolves.toBe(false);
    expect(readCookie(ACCESS_COOKIE)).toBeNull();
  });

  it('does nothing when the browser holds no session', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(restoreAuthCookies()).resolves.toBe(false);
    expect(readCookie(ACCESS_COOKIE)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does nothing when only an access token survived', async () => {
    storage.setItem('access_token', 'stored-access');
    vi.stubGlobal('fetch', vi.fn());

    await expect(restoreAuthCookies()).resolves.toBe(false);
    expect(readCookie(ACCESS_COOKIE)).toBeNull();
  });
});
