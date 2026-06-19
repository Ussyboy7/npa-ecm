"use client";

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, FileText, Inbox, Settings, BarChart3, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logError } from '@/lib/client-logger';

export type FeatureType = 
  | 'correspondence' 
  | 'approvals' 
  | 'dms' 
  | 'admin' 
  | 'reports' 
  | 'inbox'
  | 'cases'
  | 'generic';

interface FeatureErrorBoundaryProps {
  children: ReactNode;
  feature: FeatureType;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface FeatureErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface FeatureConfig {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel: string;
}

const featureConfigs: Record<FeatureType, FeatureConfig> = {
  correspondence: {
    icon: Mail,
    title: 'Correspondence Error',
    description: 'Unable to load correspondence data. Your changes are saved locally.',
    actionLabel: 'Reload Correspondence',
  },
  approvals: {
    icon: FileText,
    title: 'Approvals Error',
    description: 'Unable to load approval requests. Please try again.',
    actionLabel: 'Reload Approvals',
  },
  dms: {
    icon: FileText,
    title: 'Document Management Error',
    description: 'Unable to access documents. Please check your connection.',
    actionLabel: 'Reload Documents',
  },
  admin: {
    icon: Settings,
    title: 'Administration Error',
    description: 'Unable to load admin settings. Please try again.',
    actionLabel: 'Reload Settings',
  },
  reports: {
    icon: BarChart3,
    title: 'Reports Error',
    description: 'Unable to generate reports. Please try again later.',
    actionLabel: 'Reload Reports',
  },
  inbox: {
    icon: Inbox,
    title: 'Inbox Error',
    description: 'Unable to load your inbox. Please check your connection.',
    actionLabel: 'Reload Inbox',
  },
  cases: {
    icon: FileText,
    title: 'Cases Error',
    description: 'Unable to load case information. Please try again.',
    actionLabel: 'Reload Cases',
  },
  generic: {
    icon: AlertTriangle,
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Please try again.',
    actionLabel: 'Retry',
  },
};

export class FeatureErrorBoundary extends Component<
  FeatureErrorBoundaryProps,
  FeatureErrorBoundaryState
> {
  state: FeatureErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): FeatureErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { feature } = this.props;
    
    logError(`Feature error boundary caught error in ${feature}`, { 
      error, 
      errorInfo,
      feature,
    });

    this.setState({ errorInfo });
  }

  handleReset = () => {
    const { onReset } = this.props;
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    onReset?.();
  };

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    const { fallback, children, feature } = this.props;
    const { hasError, error } = this.state;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      const config = featureConfigs[feature] || featureConfigs.generic;
      const Icon = config.icon;

      return (
        <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-destructive/30 bg-destructive/5 p-8 text-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <Icon className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-destructive">
              {config.title}
            </h3>
            <p className="max-w-md text-sm text-muted-foreground">
              {config.description}
            </p>
            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-xs text-muted-foreground">
                  {error.message}
                  {'\n'}
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={this.handleReset}>
              {config.actionLabel}
            </Button>
            <Button variant="ghost" onClick={this.handleReload}>
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return children;
  }
}

// Convenience wrappers for specific features
export const CorrespondenceErrorBoundary: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback,
}) => (
  <FeatureErrorBoundary feature="correspondence" fallback={fallback}>
    {children}
  </FeatureErrorBoundary>
);

export const ApprovalsErrorBoundary: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback,
}) => (
  <FeatureErrorBoundary feature="approvals" fallback={fallback}>
    {children}
  </FeatureErrorBoundary>
);

export const DMSErrorBoundary: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback,
}) => (
  <FeatureErrorBoundary feature="dms" fallback={fallback}>
    {children}
  </FeatureErrorBoundary>
);

export const AdminErrorBoundary: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback,
}) => (
  <FeatureErrorBoundary feature="admin" fallback={fallback}>
    {children}
  </FeatureErrorBoundary>
);

export const ReportsErrorBoundary: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback,
}) => (
  <FeatureErrorBoundary feature="reports" fallback={fallback}>
    {children}
  </FeatureErrorBoundary>
);

export const InboxErrorBoundary: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback,
}) => (
  <FeatureErrorBoundary feature="inbox" fallback={fallback}>
    {children}
  </FeatureErrorBoundary>
);

export const CasesErrorBoundary: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback,
}) => (
  <FeatureErrorBoundary feature="cases" fallback={fallback}>
    {children}
  </FeatureErrorBoundary>
);
