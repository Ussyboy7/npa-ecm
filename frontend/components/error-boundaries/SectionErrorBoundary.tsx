"use client";

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logError } from '@/lib/client-logger';

interface SectionErrorBoundaryProps {
  children: ReactNode;
  sectionName: string;
  fallback?: ReactNode;
  onReset?: () => void;
  compact?: boolean;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * SectionErrorBoundary - A lightweight error boundary for smaller UI sections
 * 
 * Use this for wrapping individual components or sections that should fail gracefully
 * without breaking the entire page.
 */
export class SectionErrorBoundary extends Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  state: SectionErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { sectionName } = this.props;
    
    logError(`Section error in "${sectionName}"`, { 
      error, 
      errorInfo,
      sectionName,
    });
  }

  handleReset = () => {
    const { onReset } = this.props;
    this.setState({ hasError: false, error: undefined });
    onReset?.();
  };

  render() {
    const { fallback, children, sectionName, compact = false } = this.props;
    const { hasError } = this.state;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      if (compact) {
        return (
          <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-destructive">{sectionName} failed to load</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto px-2 py-0 text-xs"
              onClick={this.handleReset}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Retry
            </Button>
          </div>
        );
      }

      return (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
            <div className="flex-1 space-y-2">
              <h4 className="font-medium text-destructive">
                {sectionName} unavailable
              </h4>
              <p className="text-sm text-muted-foreground">
                This section encountered an error. You can continue using other parts of the application.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={this.handleReset}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}
