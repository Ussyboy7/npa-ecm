/**
 * Custom hook for managing user signature state and operations
 * Consolidates signature loading, template management, and preferences
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { logError } from '@/lib/client-logger';
import {
  fetchUserSignature,
  ensureDefaultSignatureTemplates,
  loadUserSignaturePreferences,
  type StoredSignature,
  type SignatureTemplate,
  type UserSignaturePreferences,
} from '@/lib/api/signatures';

interface UseSignatureOptions {
  userId?: string;
  autoLoad?: boolean;
}

interface UseSignatureReturn {
  signature: StoredSignature | null;
  isLoading: boolean;
  error: Error | null;
  templates: SignatureTemplate[];
  preferences: UserSignaturePreferences;
  loadSignature: () => Promise<void>;
  refreshSignature: () => Promise<void>;
}

const defaultPreferences: UserSignaturePreferences = {
  templateOverrides: {},
  autoApplyForMinutes: false,
};

export const useSignature = (options: UseSignatureOptions = {}): UseSignatureReturn => {
  const { userId, autoLoad = true } = options;
  const [signature, setSignature] = useState<StoredSignature | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [templates, setTemplates] = useState<SignatureTemplate[]>([]);
  const [preferences, setPreferences] = useState<UserSignaturePreferences>(defaultPreferences);

  const abortRef = useRef<AbortController | null>(null);

  // Initialize templates
  useEffect(() => {
    if (!autoLoad) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const loadTemplates = async () => {
      try {
        const defaults = await ensureDefaultSignatureTemplates(controller.signal);
        if (!controller.signal.aborted) setTemplates(defaults);
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          logError('Failed to load signature templates', error);
          setTemplates([]);
        }
      }
    };
    loadTemplates();
    return () => controller.abort();
  }, [autoLoad]);

  // Load preferences
  useEffect(() => {
    if (!autoLoad) return;
    const controller = new AbortController();
    const loadPreferences = async () => {
      if (userId) {
        try {
          const prefs = await loadUserSignaturePreferences(userId, controller.signal);
          if (!controller.signal.aborted) setPreferences(prefs ?? defaultPreferences);
        } catch (error: unknown) {
          if (!controller.signal.aborted) {
            logError('Failed to load signature preferences', error);
            setPreferences(defaultPreferences);
          }
        }
      } else {
        setPreferences(defaultPreferences);
      }
    };
    loadPreferences();
    return () => controller.abort();
  }, [userId, autoLoad]);

  const loadSignature = useCallback(async (signal?: AbortSignal) => {
    if (!userId) {
      setSignature(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sig = await fetchUserSignature(signal);
      if (!signal?.aborted) setSignature(sig);
    } catch (err) {
      if (signal?.aborted) return;
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      logError('Failed to load signature', err);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [userId]);

  const refreshSignature = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const sig = await fetchUserSignature(abortRef.current?.signal);
      if (sig) {
        setSignature(sig);
      } else {
        setSignature(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      logError('Failed to refresh signature', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Auto-load signature when userId changes
  useEffect(() => {
    const controller = new AbortController();
    if (autoLoad && userId) {
      void loadSignature(controller.signal);
    } else if (!userId) {
      setSignature(null);
    }
    return () => controller.abort();
  }, [userId, autoLoad, loadSignature]);

  return {
    signature,
    isLoading,
    error,
    templates,
    preferences,
    loadSignature,
    refreshSignature,
  };
};

