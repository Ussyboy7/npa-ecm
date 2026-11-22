import { AUTH_CSRF_COOKIE_NAME, AUTH_SESSION_COOKIE_NAME } from '@/lib/auth-cookies';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface ClientLogEntryPayload {
  level: LogLevel;
  args: unknown[];
}

const isBrowser = typeof window !== 'undefined';
const shouldPrint =
  process.env.NEXT_PUBLIC_DEBUG_LOGS === 'true' ||
  process.env.NODE_ENV !== 'production';

const batch: ClientLogEntryPayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const MAX_BATCH_SIZE = 20;
const FLUSH_INTERVAL_MS = 2000;

const logToConsole = (level: LogLevel, args: unknown[]) => {
  const target =
    level === 'error'
      ? console.error
      : level === 'warn'
        ? console.warn
        : undefined;
  target?.(...args);
};

// Track if logging is disabled to prevent infinite error loops
let loggingDisabled = false;
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

const getBaseUrl = () => {
  if (!isBrowser) return '';
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8002/api/v1';
  return base.endsWith('/') ? base.slice(0, -1) : base;
};

const getCookieValue = (name: string): string | null => {
  if (!isBrowser) return null;
  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  if (!cookie) return null;
  const value = cookie.split('=').slice(1).join('=');
  return value ? decodeURIComponent(value) : null;
};

/**
 * Browser logs are only useful for a session that exists, and the ingest view
 * rejects anonymous posts. Posting from the login page produced a stream of
 * 401s and then disabled logging for the rest of the page.
 */
const hasSession = () => Boolean(getCookieValue(AUTH_SESSION_COOKIE_NAME));

/** Same CSRF header the API client sends; the ingest view requires it. */
const logHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const csrfToken = getCookieValue(AUTH_CSRF_COOKIE_NAME);
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  return headers;
};

const flushLogs = async () => {
  if (!isBrowser || batch.length === 0 || loggingDisabled) {
    return;
  }
  if (!hasSession()) {
    // Keep the entries in memory for a session that may still start, but do
    // not spend a guaranteed 401 on every flush.
    return;
  }

  const payload = batch.splice(0, batch.length);
  const body = JSON.stringify({ entries: payload });

  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/support/client-logs/`, {
      method: 'POST',
      headers: logHeaders(),
      credentials: 'include',
      body,
      // Don't wait for response to avoid blocking
      keepalive: true,
    });

    // Reset failure counter on success
    if (response.ok) {
      consecutiveFailures = 0;
    } else if (response.status === 401 || response.status === 403) {
      // A rejected session is not a transport failure; retrying this batch
      // would keep failing. Drop it and stay enabled for the next session.
      consecutiveFailures = 0;
    } else {
      consecutiveFailures++;
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        loggingDisabled = true;
      }
    }
  } catch (_error: unknown) {
    consecutiveFailures++;
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      loggingDisabled = true;
    }
    // Silently fail - client logging should not break the app
    // Don't log errors about logging failures to prevent infinite loops
  }
};

const scheduleFlush = () => {
  if (flushTimer) {
    return;
  }
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushLogs();
  }, FLUSH_INTERVAL_MS);
};

const enqueue = (level: LogLevel, args: unknown[]) => {
  if (!isBrowser) {
    return;
  }
  batch.push({ level, args });
  if (batch.length >= MAX_BATCH_SIZE) {
    void flushLogs();
    return;
  }
  scheduleFlush();
};

const log = (level: LogLevel, args: unknown[]) => {
  if (!args.length) {
    args = [`[${level.toUpperCase()}]`];
  }

  if (isBrowser && (level === 'error' || level === 'warn')) {
    enqueue(level, args);
  }

  if (isBrowser) {
    if (shouldPrint) {
      logToConsole(level, args);
    }
    return;
  }

  logToConsole(level, args);
};
export const logInfo = (...args: unknown[]) => log('info', args);
export const logWarn = (...args: unknown[]) => log('warn', args);
export const logError = (...args: unknown[]) => log('error', args);

if (isBrowser) {
  window.addEventListener('beforeunload', () => {
    if (batch.length && !loggingDisabled && hasSession()) {
      const body = JSON.stringify({ entries: batch.splice(0, batch.length) });
      const baseUrl = getBaseUrl();
      // Use fetch with keepalive for beforeunload (similar to sendBeacon but with auth)
      fetch(`${baseUrl}/support/client-logs/`, {
        method: 'POST',
        headers: logHeaders(),
        credentials: 'include',
        body,
        keepalive: true,
      }).catch(() => {
        // Silently fail on beforeunload
      });
    }
  });
}
