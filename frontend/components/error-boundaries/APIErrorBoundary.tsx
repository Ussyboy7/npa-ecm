"use client";

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { WifiOff, ServerCrash, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logError } from '@/lib/client-logger';

interface APIErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
}

interface APIErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorType?: 'network' | 'server' | 'unknown';
}

/**
 * APIErrorBoundary - Specialized error boundary for API-related errors
 * 
 * Provides specific messaging for network vs server errors and includes retry functionality.
 */
export class APIErrorBoundary extends Component<
  APIErrorBoundaryProps,
  APIErrorBoundaryState
> {
  state: APIErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): APIErrorBoundaryState {
    let errorType: 'network' | 'server' | 'unknown' = 'unknown';
    
    if (error.message.includes('fetch') || 
        error.message.includes('network') ||
        error.message.includes('Failed to fetch') ||
        !navigator.onLine) {
      errorType = 'network';
    } else if (error.message.includes('500') || 
               error.message.includes('502') || 
               error.message.includes('503') ||
               error.message.includes('504')) {
      errorType = 'server';
    }
    
    return { hasError: true, error, errorType };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError('API Error Boundary caught error', { 
      error, 
      errorInfo,
      errorType: this.state.errorType,
    });
  }

  handleRetry = () => {
    const { onRetry } = this.props;
    this.setState({ hasError: false, error: undefined, errorType: undefined });
    onRetry?.();
  };

  getErrorConfig() {
    const { errorType } = this.state;
    
    switch (errorType) {
      case 'network':
        return {
          icon: WifiOff,
          title: 'Connection Lost',
          message: 'Unable to connect to the server. Please check your internet connection and try again.',
          action: 'Retry Connection',
        };
      case 'server':
        return {
          icon: ServerCrash,
          title: 'Server Error',
          message: 'The server encountered an error. Please wait a moment and try again.',
          action: 'Try Again',
        };
      default:
        return {
          icon: AlertTriangle,
          title: 'Request Failed',
          message: 'An unexpected error occurred while fetching data.',
          action: 'Retry',
        };
    }
  }

  render() {
    const { fallback, children } = this.props;
    const { hasError } = this.state;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      const config = this.getErrorConfig();
      const Icon = config.icon;

      return (
        <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-8 text-center">
          <div className="rounded-full bg-muted p-4">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">{config.title}</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              {config.message}
            </p>
          </div>
          <Button onClick={this.handleRetry} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            {config.action}
          </Button>
        </div>
      );
    }

    return children;
  }
}
