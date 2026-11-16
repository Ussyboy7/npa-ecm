"use client";

import { logWarn } from './client-logger';
import { clearIdentityCaches } from './identity-cache';
import {
  AUTH_CSRF_COOKIE_NAME,
  AUTH_IMPERSONATING_COOKIE_NAME,
  AUTH_ORIGINAL_USER_COOKIE_NAME,
  AUTH_SESSION_COOKIE_NAME,
} from './auth-cookies';

const isBrowser = () => typeof window !== "undefined";
export const AUTH_CHANGED_EVENT = "npa_ecm_auth_changed";
export const AUTH_BROADCAST_CHANNEL = "npa_ecm_auth";

const getCookieValue = (name: string): string | null => {
  if (!isBrowser()) return null;
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!cookie) return null;
  const value = cookie.split("=").slice(1).join("=");
  return value ? decodeURIComponent(value) : null;
};

const clearCookieValue = (name: string) => {
  if (!isBrowser()) return;
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax${secure}`;
};

const notifyAuthChanged = (invalidateIdentityCaches = true) => {
  if (!isBrowser()) return;
  if (invalidateIdentityCaches) clearIdentityCaches();
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
    channel.postMessage("auth-changed");
    channel.close();
  } catch {
    // Cross-tab sync is best-effort; the local event already fired.
  }
};

const authHeaders = (headers?: HeadersInit): Headers => {
  const requestHeaders = new Headers(headers);
  const csrfToken = getCookieValue(AUTH_CSRF_COOKIE_NAME);
  if (csrfToken) requestHeaders.set("X-CSRF-Token", csrfToken);
  return requestHeaders;
};

// JWTs live in httpOnly cookies. These helpers remain for callers that still
// ask whether a browser session exists, but no token is readable by JavaScript.
export const getStoredAccessToken = () => null;
export const getStoredRefreshToken = () => null;

/** @deprecated Tokens are set by the server in httpOnly cookies. */
export const storeTokens = (..._args: unknown[]) => {
  notifyAuthChanged();
};

export const clearTokens = () => {
  if (!isBrowser()) return;
  clearCookieValue(AUTH_SESSION_COOKIE_NAME);
  clearCookieValue(AUTH_CSRF_COOKIE_NAME);
  clearCookieValue(AUTH_IMPERSONATING_COOKIE_NAME);
  clearCookieValue(AUTH_ORIGINAL_USER_COOKIE_NAME);
  notifyAuthChanged();
};

export const hasTokens = () => Boolean(getCookieValue(AUTH_SESSION_COOKIE_NAME));

/**
 * Ask the server to rotate the httpOnly cookies from its refresh cookie. The
 * browser cannot inspect that cookie, so this is the only reliable resume path.
 */
export const restoreAuthCookies = async (): Promise<boolean> => attemptTokenRefresh();

export const getBaseUrl = (): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl || baseUrl.trim() === "") {
    throw new Error("NEXT_PUBLIC_API_URL environment variable is not set");
  }
  return baseUrl.trim().replace(/\/$/, "");
};

type FetchOptions = RequestInit & {
  skipAuth?: boolean;
  /** "raw" returns the Response so callers can read headers alongside a blob. */
  responseType?: "json" | "text" | "blob" | "raw";
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
    try {
      const res = await fetch(`${getBaseUrl()}/accounts/auth/token/refresh/`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
      });
      if (!res.ok) {
        clearTokens();
        return false;
      }
      // The response rotates the httpOnly cookies; there is nothing to store.
      notifyAuthChanged(false);
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
    skipAuth: _skipAuth,
    responseType,
    headers,
    ...rest
  } = options;

  const execute = async (): Promise<T> => {
    const requestHeaders = authHeaders(headers);

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

    if (responseType === 'raw') return response as T;

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
    if ((error as Record<string, unknown>)?.status === 401 && !path.includes("token/refresh/")) {
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
  access?: string;
  refresh?: string;
  user?: unknown;
  detail?: string;
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
      // Login set the httpOnly cookies in this response.
      notifyAuthChanged();
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
  method: "email" | "totp" | "backup_code" = "email"
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
  notifyAuthChanged();
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
  // The server owns the httpOnly refresh cookie, so it must clear the session.
  const request = fetch(`${getBaseUrl()}/accounts/auth/logout/`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    credentials: "include",
  }).catch((error) => {
    logWarn("Failed to clear server session", error);
  });

  clearTokens();
  clearOriginalTokens();
  void request;
};

/** @deprecated Impersonation is tracked by server-set cookies now. */
export const storeOriginalTokens = (_userId?: string) => {};

export const clearOriginalTokens = () => {
  if (!isBrowser()) return;
  clearCookieValue(AUTH_IMPERSONATING_COOKIE_NAME);
  clearCookieValue(AUTH_ORIGINAL_USER_COOKIE_NAME);
};

/** @deprecated Tokens are no longer readable from JavaScript. */
export const getOriginalTokens = () => null;

export const getOriginalUserId = (): string | null => getCookieValue(AUTH_ORIGINAL_USER_COOKIE_NAME);

export const hasOriginalTokens = () => Boolean(getCookieValue(AUTH_IMPERSONATING_COOKIE_NAME));

export const isImpersonatingUser = (_currentUserId?: string | null): boolean =>
  Boolean(getCookieValue(AUTH_IMPERSONATING_COOKIE_NAME));

export const impersonateUser = async (userId: string) => {
  const data = await apiFetch<{ user?: unknown }>("/accounts/auth/impersonate/", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
  notifyAuthChanged();
  return data;
};

export const returnToPrimaryUser = async () => {
  await apiFetch("/accounts/auth/impersonate/return/", { method: "POST" });
  clearOriginalTokens();
  notifyAuthChanged();
};
