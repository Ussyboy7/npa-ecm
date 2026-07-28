import { ERROR_UNKNOWN } from '@/lib/constants';
/**
 * Error handling utilities for modals
 * Provides consistent error message formatting and handling
 */

import { isRecord } from '@/lib/type-utils';
import { getApiErrorMessage, isApiForbidden, isApiUnauthorized, isNetworkError as isApiNetworkError } from '@/lib/api-error';

export interface ModalError {
  field?: string;
  message: string;
  type: 'validation' | 'api' | 'network' | 'permission' | 'unknown';
}

const getString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

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
        return error.message || ERROR_UNKNOWN;
      case 'api':
        return `Server error: ${error.message || ERROR_UNKNOWN}`;
      case 'network':
        return 'Network error. Please check your connection and try again.';
      case 'permission':
        return 'You do not have permission to perform this action.';
      case 'unknown':
      default:
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Check if error is a network error
   */
  static isNetworkError(error: unknown): boolean {
    return isApiNetworkError(error) || !navigator.onLine;
  }

  /**
   * Check if error is a permission error
   */
  static isPermissionError(error: unknown): boolean {
    return isApiForbidden(error) || isApiUnauthorized(error);
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
      message: getApiErrorMessage(error, this.extractApiError(error)),
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

