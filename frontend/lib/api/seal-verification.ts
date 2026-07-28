/** API client for seal verification. */

import { logError, logInfo } from '@/lib/client-logger';
import { apiFetch, isAbortError } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';

export interface SealVerification {
  valid: boolean;
  serial_number: string;
  sealed_by: string;
  office_name: string;
  office_title: string;
  sealed_at: string;
  document_title?: string;
  document_id?: string;
  correspondence_subject?: string;
  correspondence_id?: string;
  invalidated_at?: string;
  invalidated_reason?: string;
  error?: string;
  seal_image_url?: string;
  signature_image_url?: string;
}

export async function verifySeal(serialNumber: string, signal?: AbortSignal): Promise<SealVerification> {
  const verifyPath = `/accounts/seal/verify/${encodeURIComponent(serialNumber)}/`;
  
  try {
    const data = await apiFetch<SealVerification>(verifyPath, {
      method: 'GET',
      signal,
      skipAuth: true,
    });

    logInfo('[Seal Verification] Response received:', {
      ok: true,
      path: verifyPath,
    });

    // Ensure we have the serial number even if API didn't return it
    if (!data.serial_number) {
      data.serial_number = serialNumber;
    }
    
    // If API returned valid: false, ensure error message is set
    if (!data.valid && !data.error) {
      data.error = 'Seal not found or invalid';
    }
    
    logInfo('[Seal Verification] Success:', {
      valid: data.valid,
      serial_number: data.serial_number,
      hasError: !!data.error,
    });
    
    return data;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    // Network error (CORS, connection failed, etc.) - throw so hook can retry
    logError('Network error during seal verification:', error);
    return {
      valid: false,
      serial_number: serialNumber,
      error: getApiErrorMessage(error, 'Network error. Please check your connection and try again.'),
    } as SealVerification;
  }
}

/**
 * Validate serial number format: NPA-YYYYMMDD-XXXXXXXX
 */
export function validateSerialNumber(serial: string): { valid: boolean; error?: string } {
  const trimmed = serial.trim().toUpperCase();
  
  if (!trimmed) {
    return { valid: false, error: 'Serial number is required' };
  }
  
  // Pattern: NPA-YYYYMMDD-XXXXXXXX (8 hex chars)
  const pattern = /^NPA-\d{8}-[A-F0-9]{8}$/;
  
  if (!pattern.test(trimmed)) {
    return { 
      valid: false, 
      error: 'Invalid format. Expected: NPA-YYYYMMDD-XXXXXXXX (e.g., NPA-20241201-A8F3B2C1)' 
    };
  }
  
  // Validate date part (YYYYMMDD)
  const datePart = trimmed.substring(4, 12);
  const year = parseInt(datePart.substring(0, 4));
  const month = parseInt(datePart.substring(4, 6));
  const day = parseInt(datePart.substring(6, 8));
  
  if (year < 2020 || year > 2100) {
    return { valid: false, error: 'Invalid year in serial number' };
  }
  
  if (month < 1 || month > 12) {
    return { valid: false, error: 'Invalid month in serial number' };
  }
  
  if (day < 1 || day > 31) {
    return { valid: false, error: 'Invalid day in serial number' };
  }
  
  return { valid: true };
}

