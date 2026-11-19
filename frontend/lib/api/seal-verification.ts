/** API client for seal verification. */

import { logError, logInfo } from '@/lib/client-logger';
import { apiFetch, getBaseUrl, isAbortError } from '@/lib/api-client';
import { getApiErrorMessage, getApiErrorStatus } from '@/lib/api-error';

/** Why the lookup ended the way it did, independent of the seal's own state. */
export type SealLookupStatus = 'found' | 'not_found' | 'unavailable';

/** What the page can state about the check it actually performed. */
export type SealResultState = 'matched' | 'invalidated' | 'not_found' | 'unavailable';

export interface SealVerification {
  valid: boolean;
  lookup_status?: SealLookupStatus;
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
  pdf_sha256?: string;
  pdf_generated_at?: string | null;
  snapshot_reference?: string;
}

/**
 * Public, hash-verified image of the issued seal for a valid serial.
 * Pass a width for the server's downscaled rendition; omit it for the
 * full-resolution artifact.
 */
export function getSealImageUrl(serialNumber: string, width?: number): string {
  const path = `${getBaseUrl()}/accounts/seal/public-image/${encodeURIComponent(serialNumber)}/`;
  return width ? `${path}?width=${width}` : path;
}

export interface SealDocumentCheck {
  matches: boolean;
  expected_sha256: string;
  actual_sha256: string;
  pdf_generated_at?: string | null;
  detail: string;
}

export async function checkSealDocument(
  serialNumber: string,
  file: File,
): Promise<SealDocumentCheck> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<SealDocumentCheck>(
    `/accounts/seal/document-check/${encodeURIComponent(serialNumber)}/`,
    {
      method: "POST",
      body: formData,
      skipAuth: true,
    },
  );
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
    
    data.lookup_status = 'found';

    // If API returned valid: false, ensure error message is set
    if (!data.valid && !data.error) {
      data.error = 'This seal record is not valid.';
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

    logError('Seal verification request failed:', error);
    // A 404 means the registry answered and has no such record. Anything else
    // (network, 5xx, bad gateway) means no conclusion can be drawn at all.
    const lookup_status: SealLookupStatus =
      getApiErrorStatus(error) === 404 ? 'not_found' : 'unavailable';
    return {
      valid: false,
      serial_number: serialNumber,
      lookup_status,
      error:
        lookup_status === 'not_found'
          ? 'No seal record found for this serial.'
          : getApiErrorMessage(error, 'Network error. Please check your connection and try again.'),
    } as SealVerification;
  }
}

/**
 * Collapse a lookup response into the one claim the result page may make.
 * Unknown failure shapes are treated as an incomplete check, never as a
 * finding about the seal.
 */
export function getSealResultState(verification: SealVerification): SealResultState {
  if (verification.valid) return 'matched';
  if (verification.invalidated_at) return 'invalidated';
  if (verification.lookup_status === 'not_found') return 'not_found';
  return 'unavailable';
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

