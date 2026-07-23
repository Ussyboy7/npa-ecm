"use client";

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Route } from 'lucide-react';

export function DocumentMobileTabBar({
  minutesCount,
  mobileActiveTab,
  onSetMobileActiveTab,
}: {
  minutesCount: number;
  mobileActiveTab: 'document' | 'routing';
  onSetMobileActiveTab: (tab: 'document' | 'routing') => void;
}) {
  return (
    <div className="md:hidden border-b border-border bg-background px-2 py-1">
      <div className="flex gap-1">
        <Button
          variant={mobileActiveTab === 'document' ? 'default' : 'ghost'}
          size="sm"
          className="flex-1 text-xs"
          onClick={() => onSetMobileActiveTab('document')}
        >
          <FileText className="h-3.5 w-3.5 mr-1" />
          Document
        </Button>
        <Button
          variant={mobileActiveTab === 'routing' ? 'default' : 'ghost'}
          size="sm"
          className="flex-1 text-xs"
          onClick={() => onSetMobileActiveTab('routing')}
        >
          <Route className="h-3.5 w-3.5 mr-1" />
          Routing
          {minutesCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
              {minutesCount}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
}
