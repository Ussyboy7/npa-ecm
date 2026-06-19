/** API client for seal verification. */

import { logError, logInfo } from '@/lib/client-logger';

const getApiBaseUrl = (): string => {
  // Get API base URL - works across local/stag/prod environments
  let apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api';
  
  // Normalize: remove trailing slashes
  apiBase = apiBase.replace(/\/+$/, '');
  
  // Ensure we have /api/v1 in the URL
  if (apiBase.endsWith('/api/v1')) {
    return apiBase;
  } else if (apiBase.endsWith('/api')) {
    return `${apiBase}/v1`;
  } else {
    // Just the host (e.g., http://localhost:8002), add /api/v1
    return `${apiBase}/api/v1`;
  }
};

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
  const baseUrl = getApiBaseUrl();
  const verifyUrl = `${baseUrl}/accounts/seal/verify/${encodeURIComponent(serialNumber)}/`;
  
  try {
    const response = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      mode: 'cors',
      credentials: 'include',
      signal,
    });
    
    // Debug logging
    logInfo('[Seal Verification] Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: verifyUrl,
    });
    
    // Check if response is ok (status 200-299)
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      // Try to get error message from response
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage;
        logInfo('[Seal Verification] Error response:', errorData);
      } catch {
        // If not JSON, try text
        try {
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
          }
          logInfo('[Seal Verification] Error text:', errorText);
        } catch {
          // Use default error message
        }
      }
      
      logInfo('[Seal Verification] Returning error response:', errorMessage);
      
      // Return error response
      return {
        valid: false,
        serial_number: serialNumber,
        error: errorMessage,
      } as SealVerification;
    }
    
    // Parse successful response
    const responseText = await response.text();
    let data: SealVerification;
    
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      // If JSON parsing fails, create error response
      logError('Failed to parse verification response:', parseError, responseText);
      return {
        valid: false,
        serial_number: serialNumber,
        error: 'Invalid response from server. Please try again.',
      } as SealVerification;
    }
    
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
  } catch (networkError) {
    // Network error (CORS, connection failed, etc.) - throw so hook can retry
    logError('Network error during seal verification:', networkError);
    const errorMessage = networkError instanceof Error 
      ? networkError.message 
      : 'Network error. Please check your connection and try again.';
    
    // Throw error so the hook can retry
    throw new Error(errorMessage);
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

