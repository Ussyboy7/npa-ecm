/**
 * Error handling utilities for modals
 * Provides consistent error message formatting and handling
 */

export interface ModalError {
  field?: string;
  message: string;
  type: 'validation' | 'api' | 'network' | 'permission' | 'unknown';
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

const getNumber = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);

const getNested = (root: unknown, keys: string[]): unknown => {
  let cur: unknown = root;
  for (const key of keys) {
    if (!isRecord(cur)) return undefined;
    cur = cur[key];
  }
  return cur;
};

export class ModalErrorHandler {
  /**
   * Extract error message from API error response
   */
  static extractApiError(error: unknown): string {
    if (!error) return 'An unexpected error occurred';

    // Try different error response formats
    const detail = getNested(error, ['response', 'data', 'detail']);
    if (detail) {
      if (typeof detail === 'string') return detail;
      if (Array.isArray(detail) && detail.length > 0) {
        const first = detail[0];
        return typeof first === 'string' ? first : String(first);
      }
    }

    // Try field-specific errors
    const fieldErrors = getNested(error, ['response', 'data']);
    if (isRecord(fieldErrors)) {
      const firstField = Object.keys(fieldErrors)[0];
      const firstError = fieldErrors[firstField];
      if (Array.isArray(firstError) && firstError.length > 0) {
        const first = firstError[0];
        return `${firstField}: ${typeof first === 'string' ? first : String(first)}`;
      }
      if (typeof firstError === 'string') {
        return `${firstField}: ${firstError}`;
      }
    }

    // Try message
    if (error instanceof Error && error.message) return error.message;
    if (isRecord(error)) {
      const msg = getString(error.message);
      if (msg) return msg;
    }

    // Default
    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Format validation error message
   */
  static formatValidationError(field: string, message: string): string {
    return `${field}: ${message}`;
  }

  /**
   * Get user-friendly error message based on error type
   */
  static getUserFriendlyMessage(error: ModalError): string {
    switch (error.type) {
      case 'validation':
        return (error instanceof Error ? error.message : "Unknown error");
      case 'api':
        return `Server error: ${(error instanceof Error ? error.message : "Unknown error")}`;
      case 'network':
        return 'Network error. Please check your connection and try again.';
      case 'permission':
        return 'You do not have permission to perform this action.';
      case 'unknown':
      default:
        return (error instanceof Error ? error.message : "Unknown error") || 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Check if error is a network error
   */
  static isNetworkError(error: unknown): boolean {
    const code = isRecord(error) ? getString(error.code) : undefined;
    const message =
      error instanceof Error ? error.message : isRecord(error) ? getString(error.message) : undefined;
    const msgLower = message?.toLowerCase();

    return (
      code === 'NETWORK_ERROR' ||
      Boolean(msgLower?.includes('network')) ||
      Boolean(msgLower?.includes('fetch')) ||
      !navigator.onLine
    );
  }

  /**
   * Check if error is a permission error
   */
  static isPermissionError(error: unknown): boolean {
    const status = getNumber(getNested(error, ['response', 'status']));
    const message =
      error instanceof Error ? error.message : isRecord(error) ? getString(error.message) : undefined;
    const msgLower = message?.toLowerCase();

    return (
      status === 403 ||
      status === 401 ||
      Boolean(msgLower?.includes('permission')) ||
      Boolean(msgLower?.includes('unauthorized')) ||
      Boolean(msgLower?.includes('forbidden'))
    );
  }

  /**
   * Create error object from API error
   */
  static createErrorFromApi(error: unknown): ModalError {
    if (this.isNetworkError(error)) {
      return {
        message: 'Network error. Please check your connection and try again.',
        type: 'network',
      };
    }

    if (this.isPermissionError(error)) {
      return {
        message: 'You do not have permission to perform this action.',
        type: 'permission',
      };
    }

    return {
      message: this.extractApiError(error),
      type: 'api',
    };
  }

  /**
   * Create validation error
   */
  static createValidationError(field: string, message: string): ModalError {
    return {
      field,
      message: this.formatValidationError(field, message),
      type: 'validation',
    };
  }
}

