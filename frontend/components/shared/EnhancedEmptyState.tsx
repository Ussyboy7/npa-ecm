"use client";

import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon, FileText, Search, Filter, Upload, FolderOpen, Lightbulb, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface EnhancedEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
  variant?: 'default' | 'search' | 'filter' | 'upload' | 'folder' | 'help';
  tips?: string[];
  illustration?: ReactNode;
}

/**
 * Enhanced empty state component with illustrations and helpful tips
 */
export function EnhancedEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  children,
  variant = 'default',
  tips = [],
  illustration,
}: EnhancedEmptyStateProps) {
  // Default icon based on variant
  const defaultIcon = Icon || (() => {
    switch (variant) {
      case 'search':
        return Search;
      case 'filter':
        return Filter;
      case 'upload':
        return Upload;
      case 'folder':
        return FolderOpen;
      case 'help':
        return HelpCircle;
      default:
        return FileText;
    }
  })();

  const DisplayIcon = Icon || defaultIcon;

  // Default tips based on variant
  const defaultTips = tips.length > 0 ? tips : (() => {
    switch (variant) {
      case 'search':
        return [
          'Try using different keywords or search terms',
          'Check your spelling and try broader search terms',
          'Use filters to narrow down your search results',
        ];
      case 'filter':
        return [
          'Try adjusting your filter criteria',
          'Clear some filters to see more results',
          'Check if the filters are too restrictive',
        ];
      case 'upload':
        return [
          'Supported formats: PDF, Word, Excel, PowerPoint, Images',
          'Maximum file size: 50MB per file',
          'You can upload multiple files at once using bulk upload',
        ];
      case 'folder':
        return [
          'Create a workspace to organize related documents',
          'Use collections to group documents by project or topic',
          'Share workspaces with team members for collaboration',
        ];
      default:
        return [];
    }
  })();

  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        {/* Illustration or Icon */}
        {illustration ? (
          <div className="mb-6">{illustration}</div>
        ) : (
          <div className="mb-4 rounded-full bg-muted p-4">
            <DisplayIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        {/* Title */}
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>

        {/* Description */}
        {description && (
          <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
        )}

        {/* Action Button */}
        {action && (
          <Button onClick={action.onClick} variant="default" size="sm" className="mb-6">
            {action.label}
          </Button>
        )}

        {/* Helpful Tips */}
        {defaultTips.length > 0 && (
          <Alert className="max-w-md text-left mb-4">
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium text-sm mb-2">Helpful Tips:</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                  {defaultTips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Additional Children */}
        {children}
      </CardContent>
    </Card>
  );
}


