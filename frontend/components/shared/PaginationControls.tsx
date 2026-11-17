"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { type UsePaginationReturn } from '@/hooks/use-pagination';
import { LIST_PAGE_SIZE_OPTIONS } from '@/lib/pagination-constants';
import { cn } from '@/lib/utils';

export interface PaginationControlsProps {
  pagination: UsePaginationReturn;
  showPageSizeSelector?: boolean;
  showGoToPage?: boolean;
  pageSizeOptions?: number[];
  className?: string;
  compact?: boolean;
}

/**
 * Reusable pagination controls component
 */
export function PaginationControls({
  pagination,
  showPageSizeSelector = true,
  showGoToPage = true,
  pageSizeOptions = [...LIST_PAGE_SIZE_OPTIONS],
  className,
  compact = false,
}: PaginationControlsProps) {
  const [goToPageInput, setGoToPageInput] = useState('');

  const handleGoToPage = () => {
    const pageNum = parseInt(goToPageInput, 10);
    if (pageNum >= 1 && pageNum <= pagination.totalPages) {
      pagination.goToPage(pageNum);
      setGoToPageInput('');
    }
  };

  if (compact) {
    return (
      <div className={cn('flex items-center justify-between gap-2', className)}>
        <div className="text-sm text-muted-foreground">
          {pagination.paginationInfo.showing} of {pagination.paginationInfo.total}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={pagination.goToFirstPage}
            disabled={!pagination.canGoPrevious}
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={pagination.goToPreviousPage}
            disabled={!pagination.canGoPrevious}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium px-2">
            {pagination.page} / {pagination.totalPages}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={pagination.goToNextPage}
            disabled={!pagination.canGoNext}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={pagination.goToLastPage}
            disabled={!pagination.canGoNext}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-between gap-4 lg:flex-row lg:flex-wrap', className)}>
      <div className="flex flex-wrap items-center justify-center gap-4 lg:justify-start">
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium">{pagination.paginationInfo.showing}</span> of{' '}
          <span className="font-medium">{pagination.paginationInfo.total}</span>
        </div>

        {showPageSizeSelector && (
          <div className="flex items-center gap-2">
            <Label htmlFor="page-size" className="text-sm whitespace-nowrap">
              Per page:
            </Label>
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={(value) => pagination.setPageSize(parseInt(value, 10))}
            >
              <SelectTrigger id="page-size" className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 lg:ml-auto lg:justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={pagination.goToFirstPage}
          disabled={!pagination.canGoPrevious}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={pagination.goToPreviousPage}
          disabled={!pagination.canGoPrevious}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <span className="px-1 text-sm font-medium tabular-nums sm:hidden">
          {pagination.page} / {pagination.totalPages}
        </span>

        {showGoToPage && (
          <div className="hidden items-center gap-2 sm:flex">
            <Label htmlFor="go-to-page" className="text-sm whitespace-nowrap">
              Page:
            </Label>
            <Input
              id="go-to-page"
              type="number"
              min={1}
              max={pagination.totalPages}
              value={goToPageInput}
              onChange={(e) => setGoToPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleGoToPage();
                }
              }}
              placeholder={pagination.page.toString()}
              className="w-16"
            />
            <span className="text-sm text-muted-foreground">of {pagination.totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoToPage}
              disabled={!goToPageInput}
            >
              Go
            </Button>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={pagination.goToNextPage}
          disabled={!pagination.canGoNext}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4 sm:ml-1" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={pagination.goToLastPage}
          disabled={!pagination.canGoNext}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}