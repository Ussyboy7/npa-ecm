/**
 * Error handling utilities for modals
 * Provides consistent error message formatting and handling
 */

export interface ModalError {
  field?: string;
  message: string;
  type: 'validation' | 'api' | 'network' | 'permission' | 'unknown';
}

export class ModalErrorHandler {
  /**
   * Extract error message from API error response
   */
  static extractApiError(error: Record<string, unknown>): string {
    if (!error) return 'An unexpected error occurred';

    // Try different error response formats
    const detail = error?.response?.data?.detail;
    if (detail) {
      if (typeof detail === 'string') return detail;
      if (Array.isArray(detail) && detail.length > 0) {
        return detail[0];
      }
    }

    // Try field-specific errors
    const fieldErrors = error?.response?.data;
    if (fieldErrors && typeof fieldErrors === 'object') {
      const firstField = Object.keys(fieldErrors)[0];
      const firstError = fieldErrors[firstField];
      if (Array.isArray(firstError) && firstError.length > 0) {
        return `${firstField}: ${firstError[0]}`;
      }
      if (typeof firstError === 'string') {
        return `${firstField}: ${firstError}`;
      }
    }

    // Try message
    if (error?.message) return error.message;

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
        return error.message;
      case 'api':
        return `Server error: ${error.message}`;
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
  static isNetworkError(error: Record<string, unknown>): boolean {
    return (
      error?.code === 'NETWORK_ERROR' ||
      error?.message?.toLowerCase().includes('network') ||
      error?.message?.toLowerCase().includes('fetch') ||
      !navigator.onLine
    );
  }

  /**
   * Check if error is a permission error
   */
  static isPermissionError(error: Record<string, unknown>): boolean {
    return (
      error?.response?.status === 403 ||
      error?.response?.status === 401 ||
      error?.message?.toLowerCase().includes('permission') ||
      error?.message?.toLowerCase().includes('unauthorized') ||
      error?.message?.toLowerCase().includes('forbidden')
    );
  }

  /**
   * Create error object from API error
   */
  static createErrorFromApi(error: Record<string, unknown>): ModalError {
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

