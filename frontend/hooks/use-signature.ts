/**
 * Custom hook for managing user signature state and operations
 * Consolidates signature loading, template management, and preferences
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { logError } from '@/lib/client-logger';
import {
  fetchUserSignature,
  saveUserSignature,
  ensureDefaultSignatureTemplates,
  loadUserSignaturePreferences,
  type StoredSignature,
  type SignatureTemplate,
  type UserSignaturePreferences,
} from '@/lib/signature-storage';

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
  relevantTemplates: SignatureTemplate[];
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

  // Initialize templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const defaults = await ensureDefaultSignatureTemplates();
        setTemplates(defaults);
      } catch (error: unknown) {
        logError('Failed to load signature templates', error);
        setTemplates([]);
      }
    };
    loadTemplates();
  }, []);

  // Load preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (userId) {
        try {
          const prefs = await loadUserSignaturePreferences(userId);
          setPreferences(prefs ?? defaultPreferences);
        } catch (error: unknown) {
          logError('Failed to load signature preferences', error);
          setPreferences(defaultPreferences);
        }
      } else {
        setPreferences(defaultPreferences);
      }
    };
    loadPreferences();
  }, [userId]);

  const loadSignature = useCallback(async () => {
    if (!userId) {
      setSignature(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sig = await fetchUserSignature();
      if (sig) {
        saveUserSignature(userId, sig);
      }
      setSignature(sig);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      logError('Failed to load signature', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const refreshSignature = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const sig = await fetchUserSignature();
      if (sig) {
        saveUserSignature(userId, sig);
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
    if (autoLoad && userId) {
      void loadSignature();
    } else if (!userId) {
      setSignature(null);
    }
  }, [userId, autoLoad, loadSignature]);

  // Get relevant templates based on template type
  const relevantTemplates = useMemo(() => {
    return templates; // Can be filtered by templateType if needed
  }, [templates]);

  return {
    signature,
    isLoading,
    error,
    templates,
    preferences,
    relevantTemplates,
    loadSignature,
    refreshSignature,
  };
};

