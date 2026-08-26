"use client";

import { logWarn } from './client-logger';

const isBrowser = () => typeof window !== "undefined";
const AUTH_CHANGED_EVENT = "npa_ecm_auth_changed";
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const ACCESS_TOKEN_EXP_KEY = "access_token_exp";
const ACCESS_COOKIE_NAME = "npa_ecm_access_token";
const REFRESH_COOKIE_NAME = "npa_ecm_refresh_token";
const LEGACY_ACCESS_COOKIE_NAME = "access_token";
const LEGACY_REFRESH_COOKIE_NAME = "refresh_token";
const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const DEFAULT_REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

const getCookieValue = (name: string): string | null => {
  if (!isBrowser()) return null;
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!cookie) return null;
  const value = cookie.split("=").slice(1).join("=");
  return value ? decodeURIComponent(value) : null;
};

const setCookieValue = (name: string, value: string, maxAgeSeconds: number) => {
  if (!isBrowser()) return;
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax${secure}`;
};

const clearCookieValue = (name: string) => {
  if (!isBrowser()) return;
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax${secure}`;
};

const notifyAuthChanged = () => {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
};

// Simple auth helpers for NPA-ECM
export const getStoredAccessToken = () => {
  if (!isBrowser()) return null;
  return (
    localStorage.getItem(ACCESS_TOKEN_KEY)
    || getCookieValue(ACCESS_COOKIE_NAME)
  );
};

export const getStoredRefreshToken = () => {
  if (!isBrowser()) return null;
  return (
    localStorage.getItem(REFRESH_TOKEN_KEY)
    || getCookieValue(REFRESH_COOKIE_NAME)
  );
};

export const storeTokens = (accessToken: string, refreshToken: string, expiresInSeconds?: number) => {
  if (!isBrowser()) return;
  const accessTtlSeconds = expiresInSeconds ?? DEFAULT_ACCESS_TOKEN_TTL_SECONDS;
  const expiresAt = Date.now() + accessTtlSeconds * 1000;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(ACCESS_TOKEN_EXP_KEY, expiresAt.toString());
  setCookieValue(ACCESS_COOKIE_NAME, accessToken, accessTtlSeconds);
  setCookieValue(REFRESH_COOKIE_NAME, refreshToken, DEFAULT_REFRESH_TOKEN_TTL_SECONDS);
  clearCookieValue(LEGACY_ACCESS_COOKIE_NAME);
  clearCookieValue(LEGACY_REFRESH_COOKIE_NAME);
  notifyAuthChanged();
};

export const clearTokens = () => {
  if (!isBrowser()) return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_EXP_KEY);
  clearCookieValue(ACCESS_COOKIE_NAME);
  clearCookieValue(REFRESH_COOKIE_NAME);
  notifyAuthChanged();
};

export const hasTokens = () => {
  const token = getStoredAccessToken();
  return Boolean(token);
};

export const getBaseUrl = (): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl || baseUrl.trim() === "") {
    throw new Error("NEXT_PUBLIC_API_URL environment variable is not set");
  }
  return baseUrl.trim().replace(/\/$/, "");
};

type FetchOptions = RequestInit & {
  skipAuth?: boolean;
  responseType?: "json" | "text" | "blob";
};

export const isAbortError = (error: unknown): boolean => {
  if (!(error instanceof DOMException || error instanceof Error)) return false;
  if (error.name === 'AbortError') return true;
  return /aborted/i.test(error.message);
};

let refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${getBaseUrl()}/accounts/auth/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
        credentials: "include",
      });
      if (!res.ok) {
        clearTokens();
        return false;
      }
      const data = await res.json();
      storeTokens(
        data.access,
        typeof data.refresh === "string" ? data.refresh : refreshToken,
        data.expires_in ?? 3600,
      );
      return true;
    } catch {
      clearTokens();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export const apiFetch = async <T = unknown>(path: string, options: FetchOptions = {}): Promise<T> => {
  const {
    skipAuth,
    responseType,
    headers,
    ...rest
  } = options;

  const execute = async (): Promise<T> => {
    const requestHeaders = new Headers(headers);

    if (!skipAuth) {
      const token = getStoredAccessToken();
      if (token) {
        requestHeaders.set("Authorization", `Bearer ${token}`);
      }
    }

    if (!requestHeaders.has("Content-Type") && rest.body && !(rest.body instanceof FormData)) {
      requestHeaders.set("Content-Type", "application/json");
    }

    const fullUrl = `${getBaseUrl()}${path}`;

    const response = await fetch(fullUrl, {
      ...rest,
      headers: requestHeaders,
      credentials: "include",
    });

    if (!response.ok) {
      const responseBody = await response.text().catch(() => 'Could not read response body');
      let apiMessage: string | undefined;
      try {
        const parsed = JSON.parse(responseBody);
        if (parsed && typeof parsed === "object") {
          const p = parsed as Record<string, unknown>;
          apiMessage = (p.detail || p.message || p.error) as string | undefined;
        }
      } catch { /* Not JSON */ }

      const err = new Error(apiMessage || `HTTP ${response.status}`);
      (err as unknown as Record<string, unknown>).status = response.status;
      (err as unknown as Record<string, unknown>).apiMessage = apiMessage;
      (err as unknown as Record<string, unknown>).body = responseBody;
      throw err;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    if (responseType === 'blob') return await response.blob() as T;
    if (responseType === 'text') return await response.text() as T;
    return await response.json() as T;
  };

  try {
    return await execute();
  } catch (error: unknown) {
    if (isAbortError(error)) throw error;
    if ((error as Record<string, unknown>)?.status === 401 && !skipAuth && !path.includes("token/refresh/")) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        return await execute();
      }
      clearTokens();
    }
    throw error;
  }
};

export interface LoginResponse {
  access: string;
  refresh: string;
  user?: unknown;
}

export interface LoginMFAChallengeResponse {
  mfa_required: true;
  challenge_id: string;
  methods: string[];
  expires_in: number;
}

export type LoginStepResponse = LoginResponse | LoginMFAChallengeResponse;

export function isMfaChallenge(data: LoginStepResponse): data is LoginMFAChallengeResponse {
  return "mfa_required" in data && data.mfa_required === true;
}

export const login = async (username: string, password: string): Promise<LoginStepResponse> => {
  try {
    const response = await fetch(`${getBaseUrl()}/accounts/auth/token/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 400 || response.status === 401) {
        throw new Error("Invalid username or password");
      }
      throw new Error("Login failed");
    }

    const data = (await response.json()) as LoginStepResponse;
    if (!isMfaChallenge(data)) {
      storeTokens(data.access, data.refresh);
    }
    return data;
  } catch (error: unknown) {
    const errorObj = error as Record<string, unknown>;
    if (errorObj?.message === "Failed to fetch" || errorObj?.name === "TypeError") {
      const baseUrl = getBaseUrl();
      throw new Error(`Unable to connect to the API server at ${baseUrl}`);
    }
    throw error;
  }
};

export const verifyLoginMFA = async (
  challengeId: string,
  code: string,
  method: "email" | "totp" = "email"
): Promise<LoginResponse> => {
  const data = await apiFetch<LoginResponse>("/accounts/auth/token/mfa/", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({
      challenge_id: challengeId,
      code,
      method,
    }),
  });
  storeTokens(data.access, data.refresh);
  return data;
};

export const requestLoginMFAEmail = async (challengeId: string): Promise<void> => {
  await apiFetch("/accounts/auth/login-mfa/email/request/", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({ challenge_id: challengeId }),
  });
};

export const getOidcLoginUrl = (): string => `${getBaseUrl()}/accounts/auth/oidc/login/`;

export const fetchOidcStatus = async (): Promise<{ enabled: boolean }> =>
  apiFetch<{ enabled: boolean }>("/accounts/auth/oidc/status/");

export const logout = () => {
  const refresh = getStoredRefreshToken();

  // Clear the browser session immediately so logout never leaves the app in a
  // blank intermediate state while the best-effort blacklist request runs.
  clearTokens();
  clearOriginalTokens();

  if (refresh) {
    void fetch(`${getBaseUrl()}/accounts/auth/token/blacklist/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh }),
      credentials: "include",
    }).catch((error) => {
      logWarn("Failed to blacklist token", error);
    });
  }
};

export const storeOriginalTokens = (userId?: string) => {
  if (!isBrowser()) return;
  const access = getStoredAccessToken();
  const refresh = getStoredRefreshToken();
  if (!access || !refresh) return;
  localStorage.setItem('original_access_token', access);
  localStorage.setItem('original_refresh_token', refresh);
  const expiresAt = localStorage.getItem(ACCESS_TOKEN_EXP_KEY);
  if (expiresAt) {
    localStorage.setItem('original_access_exp', expiresAt);
  }
  if (userId) {
    localStorage.setItem('original_user_id', userId);
  } else {
    // Try to decode user ID from current access token
    try {
      const payload = JSON.parse(atob(access.split('.')[1] || ''));
      const uid = payload.user_id || payload.sub || payload.id;
      if (uid) localStorage.setItem('original_user_id', String(uid));
    } catch {
      // ignore
    }
  }
};

export const clearOriginalTokens = () => {
  if (!isBrowser()) return;
  localStorage.removeItem('original_access_token');
  localStorage.removeItem('original_refresh_token');
  localStorage.removeItem('original_access_exp');
  localStorage.removeItem('original_user_id');
};

export const getOriginalTokens = () => {
  if (!isBrowser()) return null;
  const access = localStorage.getItem('original_access_token');
  const refresh = localStorage.getItem('original_refresh_token');
  if (!access || !refresh) return null;
  const expiresAtRaw = localStorage.getItem('original_access_exp');
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : undefined;
  return { access, refresh, expiresAt };
};

export const getOriginalUserId = (): string | null => {
  if (!isBrowser()) return null;
  return localStorage.getItem('original_user_id');
};

export const hasOriginalTokens = () => {
  const tokens = getOriginalTokens();
  return Boolean(tokens && tokens.access && tokens.refresh);
};

export const isImpersonatingUser = (currentUserId?: string | null): boolean => {
  if (!hasOriginalTokens()) return false;
  let originalId = getOriginalUserId();
  if (!originalId) {
    // Back-compat for sessions stored before original_user_id existed — decode from token
    try {
      const tokens = getOriginalTokens();
      if (tokens?.access) {
        const payload = JSON.parse(atob(tokens.access.split('.')[1] || ''));
        originalId = String(payload.user_id || payload.sub || payload.id || '');
        if (originalId) localStorage.setItem('original_user_id', originalId);
      }
    } catch {
      // ignore
    }
  }
  if (!originalId || !currentUserId) return true;
  const same = String(originalId) === String(currentUserId);
  if (same) {
    // Auto-clear stale impersonation where we ended up back on original user
    clearOriginalTokens();
    return false;
  }
  return true;
};

export const impersonateUser = async (userId: string) => {
  const response = await fetch(`${getBaseUrl()}/accounts/auth/impersonate/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getStoredAccessToken()}`,
    },
    credentials: "include",
    body: JSON.stringify({ user_id: userId }),
  });
  if (!response.ok) {
    const body = await response.text();
    let detail = `HTTP ${response.status}`;
    try {
      const parsed = JSON.parse(body);
      detail = parsed.detail || detail;
    } catch {}
    throw new Error(detail);
  }
  const data = await response.json();
  storeTokens(data.access, data.refresh, data.expires_in ?? 3600);
};
