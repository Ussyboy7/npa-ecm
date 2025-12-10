"use client";

import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterBadge {
  key: string;
  label: string;
  value: string;
  onClick: () => void;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export interface FilterPanelProps {
  title?: string;
  activeFilterCount: number;
  children: ReactNode;
  onClearAll?: () => void;
  defaultOpen?: boolean;
  className?: string;
  showClearButton?: boolean;
}

/**
 * Reusable collapsible filter panel component for consistent filter UI across pages
 */
export function FilterPanel({
  title = 'Filters',
  activeFilterCount,
  children,
  onClearAll,
  defaultOpen = false,
  className,
  showClearButton = true,
}: FilterPanelProps) {
  return (
    <Collapsible defaultOpen={defaultOpen} className={cn('w-full', className)}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {title}
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </CardTitle>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {children}
            {showClearButton && activeFilterCount > 0 && onClearAll && (
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearAll}
                  className="w-full"
                  aria-label="Clear all filters"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/**
 * Filter badge component for displaying active filters
 */
export function FilterBadge({
  label,
  onClick,
  variant = 'secondary',
  className,
}: {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}) {
  return (
    <Badge
      variant={variant}
      className={cn('cursor-pointer hover:opacity-80 transition-opacity', className)}
      onClick={onClick}
    >
      {label}
      <X className="h-3 w-3 ml-1.5" />
    </Badge>
  );
}

/**
 * Filter badge group for displaying multiple active filters
 */
export function FilterBadgeGroup({
  filters,
  onRemove,
  className,
}: {
  filters: FilterBadge[];
  onRemove: (key: string) => void;
  className?: string;
}) {
  if (filters.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {filters.map((filter) => (
        <FilterBadge
          key={filter.key}
          label={filter.label}
          onClick={() => onRemove(filter.key)}
          variant={filter.variant}
        />
      ))}
    </div>
  );
}

