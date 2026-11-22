import { ERROR_UNKNOWN } from '@/lib/constants';
/**
 * Standardized Error Handler for Admin Pages
 * Provides consistent error handling and user feedback across all admin interfaces
 */

import { toast } from "@/components/ui/sonner";
import { getApiErrorMessage, isApiForbidden, isApiNotFound, isApiUnauthorized, isNetworkError } from '@/lib/api-error';
import { logError } from './client-logger';

export class AdminError extends Error {
  public code: string;
  public details: unknown;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', details?: unknown) {
    super(message);
    this.name = 'AdminError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Handle API errors with user-friendly messages
 */
export function handleApiError(error: unknown, context?: string): void {
  logError('Admin API Error', error, context);

  let title = 'Error';
  let description = 'An unexpected error occurred. Please try again.';

  if (error instanceof AdminError) {
    title = error.code.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    description = (error instanceof Error ? error.message : ERROR_UNKNOWN);
  } else {
    if (isNetworkError(error)) {
      title = 'Network Error';
      description = 'Unable to connect to the server. Please check your internet connection.';
    } else if (isApiUnauthorized(error)) {
      title = 'Authentication Error';
      description = 'Your session has expired. Please log in again.';
      // Optionally redirect to login
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } else if (isApiForbidden(error)) {
      title = 'Permission Denied';
      description = 'You do not have permission to perform this action.';
    } else if (isApiNotFound(error)) {
      title = 'Not Found';
      description = 'The requested resource was not found.';
    } else if (getApiErrorMessage(error, '').includes('500')) {
      title = 'Server Error';
      description = 'A server error occurred. Please try again later or contact support.';
    } else {
      description = getApiErrorMessage(error, ERROR_UNKNOWN);
    }
  }

  toast.error(title, {
    description,
  });
}
