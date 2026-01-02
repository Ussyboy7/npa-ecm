import { useState, useEffect, useCallback } from 'react';
import { verifySeal, type SealVerification } from '@/lib/api/seal-verification';

interface UseSealVerificationOptions {
  serial?: string;
  autoVerify?: boolean;
  retryCount?: number;
  retryDelay?: number;
}

interface UseSealVerificationReturn {
  verification: SealVerification | null;
  loading: boolean;
  error: string | null;
  verify: (serial: string) => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
}

export function useSealVerification({
  serial,
  autoVerify = true,
  retryCount = 3,
  retryDelay = 1000,
}: UseSealVerificationOptions = {}): UseSealVerificationReturn {
  const [verification, setVerification] = useState<SealVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSerial, setCurrentSerial] = useState<string | undefined>(serial);
  const [attempts, setAttempts] = useState(0);
  const [hasFetched, setHasFetched] = useState(false);

  const performVerification = useCallback(async (serialNumber: string, attempt: number = 0): Promise<void> => {
    try {
      // Only set loading on first attempt to avoid flickering
      if (attempt === 0) {
        setLoading(true);
        setError(null);
      }
      
      const data = await verifySeal(serialNumber);
      
      // Set verification with the response (valid or invalid)
      setVerification(data);
      setLoading(false);
      setAttempts(0);
      
      if (!data.valid) {
        setError(data.error || 'Seal not found or invalid');
      } else {
        setError(null); // Clear error on success
      }
    } catch (err) {
      // This is a network error - retry logic applies
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify seal. Please try again.';
      
      // Retry logic - retry on network errors
      if (attempt < retryCount) {
        // Keep loading true during retries
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        // Retry (loading stays true)
        await performVerification(serialNumber, attempt + 1);
      } else {
        // Max retries reached - now set error state
        setError(errorMessage);
        setVerification({ valid: false, serial_number: serialNumber, error: errorMessage } as SealVerification);
        setLoading(false);
        setAttempts(attempt + 1);
      }
    }
  }, [retryCount, retryDelay]);

  const verify = useCallback(async (serialNumber: string) => {
    setCurrentSerial(serialNumber);
    setHasFetched(true);
    setAttempts(0);
    await performVerification(serialNumber);
  }, [performVerification]);

  const retry = useCallback(async () => {
    if (currentSerial) {
      setAttempts(0);
      await performVerification(currentSerial);
    }
  }, [currentSerial, performVerification]);

  const reset = useCallback(() => {
    setVerification(null);
    setError(null);
    setLoading(false);
    setAttempts(0);
    setHasFetched(false);
    setCurrentSerial(undefined);
  }, []);

  // Auto-verify when serial changes
  useEffect(() => {
    if (autoVerify && serial && serial !== currentSerial && !hasFetched) {
      // Small delay to ensure component is fully mounted and ready
      const timer = setTimeout(() => {
        setCurrentSerial(serial);
        setHasFetched(true);
        void performVerification(serial);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [serial, autoVerify, currentSerial, hasFetched, performVerification]);

  return {
    verification,
    loading,
    error,
    verify,
    retry,
    reset,
  };
}

