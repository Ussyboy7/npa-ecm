import { useEffect, useRef } from 'react';

interface UsePollingOptions {
  enabled?: boolean;
  runImmediately?: boolean;
}

/**
 * Consistent polling hook to reduce duplicated setInterval logic.
 */
export const usePolling = (
  callback: () => void | Promise<void>,
  intervalMs: number,
  options: UsePollingOptions = {}
) => {
  const { enabled = true, runImmediately = false } = options;
  const savedCallback = useRef(callback);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  // Update callback ref without causing effect to re-run
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    // Clear any existing interval
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    // Don't start polling if disabled or invalid interval
    if (!enabled || intervalMs <= 0) {
      return;
    }

    // Run immediately if requested
    if (runImmediately) {
      void savedCallback.current();
    }

    // Start polling interval
    intervalIdRef.current = setInterval(() => {
      void savedCallback.current();
    }, intervalMs);

    // Cleanup function
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [enabled, intervalMs, runImmediately]);
};

