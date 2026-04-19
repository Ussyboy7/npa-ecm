"use client";

import { logError, logWarn, logInfo } from './client-logger';

const isBrowser = () => typeof window !== "undefined";

// Simple auth helpers for NPA-ECM
export const getStoredAccessToken = () => {
  if (!isBrowser()) return null;
  return localStorage.getItem('access_token');
};

export const getStoredRefreshToken = () => {
  if (!isBrowser()) return null;
  return localStorage.getItem('refresh_token');
};

export const storeTokens = (accessToken: string, refreshToken: string, expiresInSeconds?: number) => {
  if (!isBrowser()) return;
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
  if (expiresInSeconds) {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    localStorage.setItem('access_token_exp', expiresAt.toString());
  }
};

export const clearTokens = () => {
  if (!isBrowser()) return;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
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
  const normalized = baseUrl.trim().replace(/\/$/, "");
  return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
};

type FetchOptions = RequestInit & {
  skipAuth?: boolean;
  responseType?: "json" | "text" | "blob";
};

export const apiFetch = async <T = unknown>(path: string, options: FetchOptions = {}): Promise<T> => {
  const {
    skipAuth,
    headers,
    responseType = "json",
    ...rest
  } = options;

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
    let responseBody = '';
    try {
      responseBody = await response.text();
    } catch (e) {
      responseBody = 'Could not read response body';
    }

    let apiMessage: string | undefined;
    try {
      const parsed = JSON.parse(responseBody);
      if (parsed && typeof parsed === "object") {
        apiMessage = (parsed as any).detail || (parsed as any).message || (parsed as any).error;
      }
    } catch {
      // Not JSON
    }

    const err = new Error(apiMessage || `HTTP ${response.status}`);
    (err as any).status = response.status;
    (err as any).apiMessage = apiMessage;
    (err as any).body = responseBody;
    throw err;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return await response.json() as T;
};

export interface LoginResponse {
  access: string;
  refresh: string;
  user: unknown;
}

export const login = async (username: string, password: string): Promise<LoginResponse> => {
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

    const data = (await response.json()) as LoginResponse;
    storeTokens(data.access, data.refresh);
    return data;
  } catch (error: unknown) {
    const errorObj = error as any;
    if (errorObj?.message === "Failed to fetch" || errorObj?.name === "TypeError") {
      const baseUrl = getBaseUrl();
      throw new Error(`Unable to connect to the API server at ${baseUrl}`);
    }
    throw error;
  }
};

export const logout = async () => {
  const refresh = getStoredRefreshToken();
  if (refresh) {
    try {
      await fetch(`${getBaseUrl()}/accounts/auth/token/blacklist/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh }),
        credentials: "include",
      });
    } catch (error) {
      logWarn("Failed to blacklist token", error);
    }
  }
  clearTokens();
};

// Impersonation functions (simplified)
export const storeOriginalTokens = () => {
  if (!isBrowser()) return;
  const access = localStorage.getItem('access_token');
  const refresh = localStorage.getItem('refresh_token');
  if (!access || !refresh) return;
  localStorage.setItem('original_access_token', access);
  localStorage.setItem('original_refresh_token', refresh);
};

export const clearOriginalTokens = () => {
  if (!isBrowser()) return;
  localStorage.removeItem('original_access_token');
  localStorage.removeItem('original_refresh_token');
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

export const hasOriginalTokens = () => {
  const tokens = getOriginalTokens();
  return Boolean(tokens && tokens.access && tokens.refresh);
};

export const impersonateUser = async (username: string) => {
  // Simplified impersonation - just login as the user
  // This might need to be implemented properly in the backend
  throw new Error("Impersonation not implemented");
};