"use client";

import { ReactNode } from 'react';
import { TableHead } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTableSort, type UseTableSortReturn } from '@/hooks/use-table-sort';

export interface SortableTableHeaderProps<T extends string = string> {
  field: T;
  sort: UseTableSortReturn<T>;
  children: ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

/**
 * Sortable table header cell component
 */
export function SortableTableHeader<T extends string = string>({
  field,
  sort,
  children,
  className,
  align = 'left',
}: SortableTableHeaderProps<T>) {
  const sortIcon = sort.getSortIcon(field);
  const isActive = sort.sort.field === field;

  return (
    <TableHead className={cn(className)}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-auto p-0 font-semibold hover:bg-transparent',
          isActive && 'text-foreground',
          align === 'center' && 'justify-center',
          align === 'right' && 'justify-end'
        )}
        onClick={() => sort.toggleSort(field)}
      >
        <span className="flex items-center gap-2">
          {children}
          <span className="flex items-center">
            {sortIcon === 'asc' && <ArrowUp className="h-4 w-4" />}
            {sortIcon === 'desc' && <ArrowDown className="h-4 w-4" />}
            {sortIcon === 'none' && <ArrowUpDown className="h-4 w-4 opacity-50" />}
          </span>
        </span>
      </Button>
    </TableHead>
  );
}

