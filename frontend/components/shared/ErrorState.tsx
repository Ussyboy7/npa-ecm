"use client";

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  variant?: 'card' | 'alert' | 'inline';
}

export const ErrorState = ({
  title = 'Something went wrong',
  message = 'An error occurred while loading this content. Please try again.',
  onRetry,
  retryLabel = 'Try Again',
  variant = 'card',
}: ErrorStateProps) => {
  const errorContent = (
    <div className="flex flex-col items-center justify-center gap-3 py-6">
      <AlertCircle className="h-8 w-8 text-destructive" />
      <div className="text-center space-y-1">
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md">{message}</p>
      </div>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="default"
          size="sm"
          className="mt-2"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {retryLabel}
        </Button>
      )}
    </div>
  );

  if (variant === 'alert') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          <p className="mb-2">{message}</p>
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {retryLabel}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="py-4">
        {errorContent}
      </div>
    );
  }

  return (
    <Card className="border-destructive bg-destructive/5">
      <CardContent className="p-6">
        {errorContent}
      </CardContent>
    </Card>
  );
};

