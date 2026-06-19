import { ERROR_UNKNOWN } from '@/lib/constants';
/**
 * Standardized Error Handler for Admin Pages
 * Provides consistent error handling and user feedback across all admin interfaces
 */

import { toast } from '@/hooks/use-toast';
import { logError } from './client-logger';

export interface ApiError {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
  [key: string]: unknown;
}

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
  } else if (error instanceof Error) {
    if ((error instanceof Error ? error.message : ERROR_UNKNOWN).includes('fetch')) {
      title = 'Network Error';
      description = 'Unable to connect to the server. Please check your internet connection.';
    } else if ((error instanceof Error ? error.message : ERROR_UNKNOWN).includes('401') || (error instanceof Error ? error.message : ERROR_UNKNOWN).includes('Unauthorized')) {
      title = 'Authentication Error';
      description = 'Your session has expired. Please log in again.';
      // Optionally redirect to login
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } else if ((error instanceof Error ? error.message : ERROR_UNKNOWN).includes('403') || (error instanceof Error ? error.message : ERROR_UNKNOWN).includes('Forbidden')) {
      title = 'Permission Denied';
      description = 'You do not have permission to perform this action.';
    } else if ((error instanceof Error ? error.message : ERROR_UNKNOWN).includes('404')) {
      title = 'Not Found';
      description = 'The requested resource was not found.';
    } else if ((error instanceof Error ? error.message : ERROR_UNKNOWN).includes('500')) {
      title = 'Server Error';
      description = 'A server error occurred. Please try again later or contact support.';
    } else {
      description = (error instanceof Error ? error.message : ERROR_UNKNOWN);
    }
  }

  toast({
    title,
    description,
    variant: 'destructive',
  });
}

/**
 * Handle validation errors from API
 */
export function handleValidationErrors(errors: Record<string, string[]>): void {
  const errorMessages = Object.entries(errors)
    .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
    .join('\n');

  toast({
    title: 'Validation Error',
    description: errorMessages,
    variant: 'destructive',
  });
}

/**
 * Show success message
 */
export function showSuccess(message: string, title: string = 'Success'): void {
  toast({
    title,
    description: message,
  });
}

/**
 * Show warning message
 */
export function showWarning(message: string, title: string = 'Warning'): void {
  toast({
    title,
    description: message,
    variant: 'default',
  });
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error: unknown) {
      handleApiError(error, context);
      throw error;
    }
  }) as T;
}

/**
 * Parse API error response
 */
export async function parseApiError(response: Response): Promise<AdminError> {
  let errorData: ApiError = {};
  
  try {
    errorData = await response.json();
  } catch {
    // If JSON parsing fails, use status text
    errorData = { detail: response.statusText };
  }

  const message = errorData.detail || errorData.message || 'An error occurred';
  const code = `HTTP_${response.status}`;

  return new AdminError(message, code, errorData);
}

/**
 * Retry failed operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Confirm dangerous action
 */
export async function confirmAction(
  message: string,
  title: string = 'Confirm Action'
): Promise<boolean> {
  return new Promise((resolve) => {
    const confirmed = window.confirm(`${title}\n\n${message}`);
    resolve(confirmed);
  });
}

/**
 * Batch error handler for bulk operations
 */
export function handleBulkOperationErrors(
  errors: string[],
  successCount: number,
  totalCount: number
): void {
  if (errors.length === 0) {
    showSuccess(`Successfully processed ${successCount} of ${totalCount} items`);
  } else if (successCount > 0) {
    showWarning(
      `Processed ${successCount} of ${totalCount} items. ${errors.length} failed:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...and ${errors.length - 5} more` : ''}`,
      'Partial Success'
    );
  } else {
    handleApiError(
      new AdminError(
        `All operations failed:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...and ${errors.length - 5} more` : ''}`,
        'BULK_OPERATION_FAILED'
      )
    );
  }
}

