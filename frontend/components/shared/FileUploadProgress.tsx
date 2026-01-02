"use client";

import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UploadedFile } from '@/hooks/use-file-upload';

interface FileUploadProgressProps {
  file: UploadedFile;
  showDetails?: boolean;
  className?: string;
}

export const FileUploadProgress = ({
  file,
  showDetails = true,
  className,
}: FileUploadProgressProps) => {
  const status = file.uploadStatus || 'pending';
  const progress = file.uploadProgress || 0;

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Uploaded';
      case 'error':
        return file.uploadError || 'Upload failed';
      case 'uploading':
        return `Uploading... ${Math.round(progress)}%`;
      default:
        return 'Pending';
    }
  };

  if (status === 'pending') {
    return null; // Don't show progress for pending files
  }

  return (
    <div className={cn('space-y-2', className)}>
      {showDetails && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{file.name}</span>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className={cn(
              'text-xs',
              status === 'completed' && 'text-success',
              status === 'error' && 'text-destructive',
              status === 'uploading' && 'text-primary'
            )}>
              {getStatusText()}
            </span>
          </div>
        </div>
      )}
      
      {status === 'uploading' && (
        <Progress value={progress} className="h-2" />
      )}
      
      {status === 'error' && file.uploadError && (
        <p className="text-xs text-destructive mt-1">{file.uploadError}</p>
      )}
    </div>
  );
};

