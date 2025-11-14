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
        : level === 'debug'
          ? console.debug
          : console.info;
  target?.(...args);
};

const flushLogs = async () => {
  if (!isBrowser || batch.length === 0) {
    return;
  }

  const payload = batch.splice(0, batch.length);
  const body = JSON.stringify({ entries: payload });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        '/api/v1/support/client-logs/',
        new Blob([body], { type: 'application/json' }),
      );
      return;
    }

    await fetch('/api/v1/support/client-logs/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to flush client logs', error);
    }
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

export const logDebug = (...args: unknown[]) => log('debug', args);
export const logInfo = (...args: unknown[]) => log('info', args);
export const logWarn = (...args: unknown[]) => log('warn', args);
export const logError = (...args: unknown[]) => log('error', args);

if (isBrowser) {
  window.addEventListener('beforeunload', () => {
    if (batch.length) {
      const body = JSON.stringify({ entries: batch.splice(0, batch.length) });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/v1/support/client-logs/',
          new Blob([body], { type: 'application/json' }),
        );
      }
    }
  });
}
