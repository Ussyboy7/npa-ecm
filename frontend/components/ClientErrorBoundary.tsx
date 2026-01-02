"use client";

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logError } from '@/lib/client-logger';
import { isAuthenticationError } from '@/lib/auth-errors';

interface ClientErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ClientErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ClientErrorBoundary extends Component<
  ClientErrorBoundaryProps,
  ClientErrorBoundaryState
> {
  state: ClientErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ClientErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError('Client boundary caught error', { error, info });
    
    // Redirect to login if authentication error
    // Use setTimeout to avoid interfering with React's error handling
    if (isAuthenticationError(error)) {
      if (typeof window !== 'undefined') {
        // Store current path for redirect after login
        const currentPath = window.location.pathname + window.location.search;
        sessionStorage.setItem('redirect_after_login', currentPath);
        // Use setTimeout to defer redirect and avoid React rendering issues
        setTimeout(() => {
          window.location.href = '/login';
        }, 0);
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    const { fallback, children } = this.props;
    if (this.state.hasError) {
      // If it's an authentication error, redirect will happen in componentDidCatch
      // Show a brief message while redirecting
      if (this.state.error && isAuthenticationError(this.state.error)) {
        return (
          <div className="flex h-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/40 p-10 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <div>
              <h2 className="text-lg font-semibold">Authentication Required</h2>
              <p className="text-sm text-muted-foreground">
                Your session has expired. Redirecting to login...
              </p>
            </div>
          </div>
        );
      }

      if (fallback) {
        return fallback;
      }

      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/40 p-10 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <div>
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              The interface crashed unexpectedly. Try reloading the section to continue.
            </p>
          </div>
          <Button variant="outline" onClick={this.handleReset}>
            Retry
          </Button>
        </div>
      );
    }

    return children;
  }
}
