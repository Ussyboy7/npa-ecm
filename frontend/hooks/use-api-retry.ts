/**
 * Custom hook for API requests with retry logic
 * Handles retries for critical API calls with exponential backoff
 */

import { useCallback } from 'react';
import { logError, logWarn } from '@/lib/client-logger';
import { isAuthenticationError } from '@/lib/auth-errors';

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  retryableStatuses?: number[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Hook for making API requests with automatic retry logic
 * 
 * @param options - Retry configuration options
 * @returns Function to execute API calls with retry logic
 * 
 * @example
 * const { fetchWithRetry } = useApiRetry({ maxRetries: 3 });
 * 
 * try {
 *   const data = await fetchWithRetry(() => apiFetch('/correspondence/items/123/'));
 * } catch (error: unknown) {
 *   // Handle error after all retries exhausted
 * }
 */
export const useApiRetry = (options: RetryOptions = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options };

  const fetchWithRetry = useCallback(
    async <T>(
      fetchFn: () => Promise<T>,
      attempt = 1
    ): Promise<T> => {
      try {
        return await fetchFn();
      } catch (error: Record<string, unknown>) {
        // Don't retry authentication errors - let them propagate immediately
        if (isAuthenticationError(error)) {
          throw error;
        }

        const isRetryable =
          attempt < config.maxRetries &&
          (error?.status
            ? config.retryableStatuses.includes(error.status)
            : error?.name !== 'AbortError' && !error?.message?.includes('401'));

        if (!isRetryable) {
          throw error;
        }

        const delay = config.exponentialBackoff
          ? config.retryDelay * Math.pow(2, attempt - 1)
          : config.retryDelay;

        logWarn(`API request failed (attempt ${attempt}/${config.maxRetries}), retrying in ${delay}ms...`, error);

        await new Promise((resolve) => setTimeout(resolve, delay));

        return fetchWithRetry(fetchFn, attempt + 1);
      }
    },
    [config]
  );

  return { fetchWithRetry };
};

