"use client";

import { logError, logWarn } from '@/lib/client-logger';
import { AuthenticationError, AuthenticationExpiredError } from './auth-errors';
const ACCESS_TOKEN_KEY = "npa_ecm_access_token";
const REFRESH_TOKEN_KEY = "npa_ecm_refresh_token";
const ACCESS_TOKEN_EXP_KEY = "npa_ecm_access_exp";
const ORIGINAL_ACCESS_TOKEN_KEY = "npa_ecm_original_access";
const ORIGINAL_REFRESH_TOKEN_KEY = "npa_ecm_original_refresh";
const ORIGINAL_ACCESS_EXP_KEY = "npa_ecm_original_access_exp";

export const getBaseUrl = () => {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002/api/v1";
  return base.endsWith("/") ? base.slice(0, -1) : base;
};

const isBrowser = () => typeof window !== "undefined";

type FetchOptions = RequestInit & {
  skipAuth?: boolean;
  responseType?: "json" | "text" | "blob";
  signal?: AbortSignal;
};

export const getStoredAccessToken = () => {
  if (!isBrowser()) return null;
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiresAtRaw = localStorage.getItem(ACCESS_TOKEN_EXP_KEY);
  if (!token || !expiresAtRaw) return null;
  const expiresAt = Number(expiresAtRaw);
  if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
    return null;
  }
  return token;
};

export const getStoredRefreshToken = () => {
  if (!isBrowser()) return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const storeTokens = (accessToken: string, refreshToken: string, expiresInSeconds?: number) => {
  if (!isBrowser()) return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  const effectiveExpires = typeof expiresInSeconds === "number" ? expiresInSeconds : 60 * 60;
  const expiresAt = Date.now() + effectiveExpires * 1000 - 30 * 1000; // refresh a little early
  localStorage.setItem(ACCESS_TOKEN_EXP_KEY, `${expiresAt}`);
  
  // Set cookie for middleware to check authentication
  // Cookie expires when token expires (or 7 days max)
  const cookieMaxAge = Math.min(effectiveExpires, 7 * 24 * 60 * 60); // Max 7 days
  document.cookie = `npa_ecm_authenticated=true; path=/; max-age=${cookieMaxAge}; samesite=lax`;
};

export const clearTokens = () => {
  if (!isBrowser()) return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_EXP_KEY);
  
  // Clear authentication cookie
  document.cookie = 'npa_ecm_authenticated=; path=/; max-age=0; samesite=lax';
};

const storeOriginalTokenValues = (accessToken: string, refreshToken: string, expiresInSeconds?: number) => {
  if (!isBrowser()) return;
  localStorage.setItem(ORIGINAL_ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(ORIGINAL_REFRESH_TOKEN_KEY, refreshToken);
  if (typeof expiresInSeconds === "number") {
    const expiresAt = Date.now() + expiresInSeconds * 1000 - 30 * 1000;
    localStorage.setItem(ORIGINAL_ACCESS_EXP_KEY, `${expiresAt}`);
  }
};

export const storeOriginalTokens = () => {
  if (!isBrowser()) return;
  if (localStorage.getItem(ORIGINAL_ACCESS_TOKEN_KEY)) return;
  const access = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!access || !refresh) return;
  const existingExpiry = localStorage.getItem(ACCESS_TOKEN_EXP_KEY);
  storeOriginalTokenValues(access, refresh);
  if (existingExpiry) {
    localStorage.setItem(ORIGINAL_ACCESS_EXP_KEY, existingExpiry);
  }
};

export const getOriginalTokens = () => {
  if (!isBrowser()) return null;
  const access = localStorage.getItem(ORIGINAL_ACCESS_TOKEN_KEY);
  const refresh = localStorage.getItem(ORIGINAL_REFRESH_TOKEN_KEY);
  if (!access || !refresh) return null;
  const expiresAtRaw = localStorage.getItem(ORIGINAL_ACCESS_EXP_KEY);
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : undefined;
  return { access, refresh, expiresAt };
};

export const hasOriginalTokens = () => {
  const tokens = getOriginalTokens();
  return Boolean(tokens && tokens.access && tokens.refresh);
};

export const clearOriginalTokens = () => {
  if (!isBrowser()) return;
  localStorage.removeItem(ORIGINAL_ACCESS_TOKEN_KEY);
  localStorage.removeItem(ORIGINAL_REFRESH_TOKEN_KEY);
  localStorage.removeItem(ORIGINAL_ACCESS_EXP_KEY);
};

const refreshWithToken = async (refreshToken: string): Promise<LoginResponse | null> => {
  const response = await fetch(`${getBaseUrl()}/accounts/auth/token/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh: refreshToken }),
    credentials: "include",
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as LoginResponse;
  return data;
};

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  try {
    const data = await refreshWithToken(refreshToken);
    if (!data || !data.access) {
      clearTokens();
      return null;
    }
    storeTokens(data.access, data.refresh ?? refreshToken, data.expires_in);
    return data.access;
      } catch (error: unknown) {
    logError("Failed to refresh access token", error);
  }

  return null;
};

const ensureAccessToken = async (): Promise<string | null> => {
  const token = getStoredAccessToken();
  if (token) return token;
  return refreshAccessToken();
};

export const apiFetch = async <T = unknown>(path: string, options: FetchOptions = {}): Promise<T> => {
  const { skipAuth, headers, responseType = "json", signal, ...rest } = options;
  const requestHeaders = new Headers(headers);

  if (!skipAuth) {
    const token = await ensureAccessToken();
    if (!token) {
      clearTokens();
      throw new AuthenticationError("Authentication required");
    }
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  if (!requestHeaders.has("Content-Type") && rest.body && !(rest.body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
  }

  // Check if request was aborted before making the fetch
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }

  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}${path}`, {
      ...rest,
      headers: requestHeaders,
      credentials: "include",
      signal, // Pass AbortSignal to fetch
    });
  } catch (fetchError) {
    // Handle network errors (connection refused, CORS, etc.)
    if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
      throw new Error(`Failed to fetch: Network error - ${fetchError.message}`);
    }
    throw fetchError;
  }

  if (response.status === 401 && !skipAuth) {
    // Check if aborted before retry
    if (signal?.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }
    
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      requestHeaders.set("Authorization", `Bearer ${refreshed}`);
      const retryResponse = await fetch(`${getBaseUrl()}${path}`, {
        ...rest,
        headers: requestHeaders,
        credentials: "include",
        signal, // Pass AbortSignal to retry fetch
      });
      
      // If retry also returns 401, authentication has expired
      if (retryResponse.status === 401) {
        clearTokens();
        throw new AuthenticationExpiredError("Authentication expired");
      }
      
      if (!retryResponse.ok) {
        throw new Error(`API request failed: ${retryResponse.status}`);
      }
      if (retryResponse.status === 204) {
        return undefined as T;
      }
      return retryResponse.json() as Promise<T>;
    }

    clearTokens();
    throw new AuthenticationExpiredError("Authentication expired");
  }

  if (!response.ok) {
    let errorMessage = `API request failed with status ${response.status}`;
    let errorDetails: unknown = undefined;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorDetails = (errorData as Record<string, unknown> | undefined)?.details;
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.non_field_errors) {
          errorMessage = Array.isArray(errorData.non_field_errors) 
            ? errorData.non_field_errors.join(', ') 
            : String(errorData.non_field_errors);
        } else {
          errorMessage = JSON.stringify(errorData);
        }
      } else {
        const body = await response.text();
        if (body) {
          errorMessage = body;
        }
      }
    } catch (parseError) {
      // If we can't parse the error, use the status text
      errorMessage = response.statusText || `HTTP ${response.status}`;
    }

    if (errorDetails && typeof errorDetails === "object") {
      const flattened = Object.entries(errorDetails)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}: ${value.join(", ")}`;
          }
          if (typeof value === "string") {
            return `${key}: ${value}`;
          }
          return `${key}: ${JSON.stringify(value)}`;
        })
        .filter(Boolean)
        .join(" | ");
      if (flattened) {
        errorMessage = `${errorMessage} — ${flattened}`;
      }
    }

    const error = new Error(errorMessage) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (responseType === "blob") {
    return (await response.blob()) as T;
  }

  if (responseType === "text") {
    return (await response.text()) as T;
  }

  return response.json() as Promise<T>;
};

export interface LoginResponse {
  access: string;
  refresh: string;
  user: unknown;
  expires_in?: number;
}

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(`${getBaseUrl()}/accounts/auth/token/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Invalid credentials");
  }

  const data = (await response.json()) as LoginResponse;
  storeTokens(data.access, data.refresh, data.expires_in);
  return data;
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
      } catch (error: unknown) {
      logWarn("Failed to blacklist token", error);
    }
  }
  clearTokens();
};

export const hasTokens = () => {
  if (!isBrowser()) return false;
  // Check if we have a valid (non-expired) access token, or at least a refresh token
  const accessToken = getStoredAccessToken();
  const refreshToken = getStoredRefreshToken();
  return Boolean(accessToken || refreshToken);
};

export const buildQueryString = (params: Record<string, string | number | boolean | undefined>) => {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== "");
  if (entries.length === 0) return "";
  const query = new URLSearchParams(entries as [string, string][]);
  return `?${query.toString()}`;
};

const getTokenForImpersonation = () => {
  const original = getOriginalTokens();
  if (original?.access) {
    return { token: original.access, refresh: original.refresh, isOriginal: true };
  }
  const access = getStoredAccessToken();
  const refresh = getStoredRefreshToken();
  if (!access || !refresh) {
    return { token: null, refresh: null, isOriginal: false };
  }
  return { token: access, refresh, isOriginal: false };
};

export const impersonateUser = async (username: string) => {
  const { token: baseToken, refresh: baseRefresh, isOriginal } = getTokenForImpersonation();
  if (!baseToken) {
    throw new Error("Authentication required");
  }

  const attempt = async (accessToken: string) =>
    fetch(`${getBaseUrl()}/accounts/auth/impersonate/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ username }),
      credentials: "include",
    });

  let response = await attempt(baseToken);

  if (response.status === 401 && isOriginal && baseRefresh) {
    const refreshed = await refreshWithToken(baseRefresh);
    if (!refreshed || !refreshed.access) {
      clearOriginalTokens();
      throw new Error("Your Super Admin session expired. Please log in again.");
    }
    storeOriginalTokenValues(refreshed.access, refreshed.refresh ?? baseRefresh, refreshed.expires_in);
    response = await attempt(refreshed.access);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Unable to impersonate user (status ${response.status})`);
  }

  const data = (await response.json()) as LoginResponse;
  if (!data.refresh) {
    throw new Error("Impersonation response missing refresh token");
  }
  storeTokens(data.access, data.refresh, data.expires_in);
  return data;
};