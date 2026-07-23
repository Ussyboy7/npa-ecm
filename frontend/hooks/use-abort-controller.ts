import { useCallback, useEffect, useRef } from "react";

export function useAbortController() {
  const ref = useRef<AbortController | null>(null);

  const getSignal = useCallback(() => {
    if (ref.current) ref.current.abort();
    const controller = new AbortController();
    ref.current = controller;
    return controller.signal;
  }, []);

  const reset = useCallback(() => {
    if (ref.current) {
      ref.current.abort();
      ref.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (ref.current) ref.current.abort();
    };
  }, []);

  return { getSignal, reset };
}
