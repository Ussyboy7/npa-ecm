"use client";

import { FileX, Search, Inbox } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: 'file' | 'search' | 'inbox' | React.ReactNode;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'muted' | 'dashed';
  className?: string;
}

const iconMap = {
  file: FileX,
  search: Search,
  inbox: Inbox,
};

export const EmptyState = ({
  icon = 'file',
  title = 'No items found',
  message = 'There are no items to display at this time.',
  actionLabel,
  onAction,
  variant = 'default',
  className,
}: EmptyStateProps) => {
  const IconComponent = typeof icon === 'string' ? iconMap[icon] : null;
  const CustomIcon = typeof icon !== 'string' ? icon : null;

  const variantClasses = {
    default: 'border-border bg-card',
    muted: 'border-muted bg-muted/30',
    dashed: 'border-dashed bg-muted/20',
  };

  return (
    <Card className={cn('border', variantClasses[variant], className)}>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 px-6">
        {IconComponent && (
          <IconComponent className="h-12 w-12 text-muted-foreground" />
        )}
        {CustomIcon && <div className="text-muted-foreground">{CustomIcon}</div>}
        
        <div className="text-center space-y-1">
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
        </div>

        {actionLabel && onAction && (
          <Button
            onClick={onAction}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
