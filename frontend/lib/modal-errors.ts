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
  private static getErrorMessage(error: Record<string, unknown>): string {
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      return error.message;
    }
    return '';
  }
  /**
   * Extract error message from API error response
   */
  static extractApiError(error: Record<string, unknown>): string {
    if (!error) return 'An unexpected error occurred';

    // Try different error response formats
    const response = error?.response as Record<string, unknown> | undefined;
    const data = response?.data as Record<string, unknown> | undefined;
    const detail = data?.detail;
    if (detail) {
      if (typeof detail === 'string') return detail;
      if (Array.isArray(detail) && detail.length > 0) {
        return String(detail[0]);
      }
    }

    // Try field-specific errors
    const fieldErrors = data;
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
    const message = this.getErrorMessage(error);
    if (message) return message;

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
  static isNetworkError(error: Record<string, unknown>): boolean {
    const message = this.getErrorMessage(error).toLowerCase();
    return (
      error?.code === 'NETWORK_ERROR' ||
      message.includes('network') ||
      message.includes('fetch') ||
      !navigator.onLine
    );
  }

  /**
   * Check if error is a permission error
   */
  static isPermissionError(error: Record<string, unknown>): boolean {
    const message = this.getErrorMessage(error).toLowerCase();
    const response = error?.response as { status?: number } | undefined;
    return (
      response?.status === 403 ||
      response?.status === 401 ||
      message.includes('permission') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
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

