/**
 * Authentication error types and utilities
 */

export class AuthenticationError extends Error {
  constructor(message: string = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthenticationExpiredError extends Error {
  constructor(message: string = "Authentication expired") {
    super(message);
    this.name = "AuthenticationExpiredError";
  }
}

/**
 * Check if an error is an authentication error
 */
export const isAuthenticationError = (error: unknown): boolean => {
  if (error instanceof AuthenticationError || error instanceof AuthenticationExpiredError) {
    return true;
  }
  if (error instanceof Error) {
    return (
      error.name === "AuthenticationError" ||
      error.name === "AuthenticationExpiredError" ||
      error.message === "Authentication required" ||
      error.message === "Authentication expired" ||
      error.message.includes("Authentication required") ||
      error.message.includes("Authentication expired")
    );
  }
  return false;
};

/**
 * Handle authentication errors by redirecting to login
 * Call this in catch blocks when you want to redirect on auth errors
 */
export const handleAuthenticationError = (error: unknown): boolean => {
  if (!isAuthenticationError(error)) {
    return false;
  }

  // Store current path for redirect after login
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname + window.location.search;
    sessionStorage.setItem('redirect_after_login', currentPath);
    // Use setTimeout to defer redirect and avoid React rendering issues
    setTimeout(() => {
      window.location.href = '/login';
    }, 0);
  }

  return true;
};

/**
 * Get the stored redirect path after login
 * Removes the path from sessionStorage after retrieving it
 */
export const getStoredRedirectPath = (): string | null => {
  if (typeof window === 'undefined') return null;
  const path = sessionStorage.getItem('redirect_after_login');
  if (path) {
    sessionStorage.removeItem('redirect_after_login');
  }
  return path;
};

