"use client";

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Route } from 'lucide-react';
import type { Correspondence } from '@/lib/npa-structure';
import type { DocumentRecord } from '@/lib/dms-storage';
import { DocumentPreviewPanel } from './DocumentPreviewPanel';
import { RoutingPanel } from './RoutingPanel';
import type { ComponentProps } from 'react';

type DocumentPreviewPanelProps = ComponentProps<typeof DocumentPreviewPanel>;
type RoutingPanelProps = ComponentProps<typeof RoutingPanel>;

interface CorrespondenceWorkspaceProps {
  correspondence: Correspondence;
  minutesCount: number;
  mobileActiveTab: 'document' | 'routing';
  onSetMobileActiveTab: (tab: 'document' | 'routing') => void;
  documentPanelProps: Omit<DocumentPreviewPanelProps, 'correspondence'>;
  routingPanelProps: RoutingPanelProps | null;
  hideMobileTabBar?: boolean;
}

export function CorrespondenceMobileTabBar({
  minutesCount,
  mobileActiveTab,
  onSetMobileActiveTab,
}: Pick<CorrespondenceWorkspaceProps, 'minutesCount' | 'mobileActiveTab' | 'onSetMobileActiveTab'>) {
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

export function CorrespondenceWorkspace({
  correspondence,
  minutesCount,
  mobileActiveTab,
  onSetMobileActiveTab,
  documentPanelProps,
  routingPanelProps,
  hideMobileTabBar = false,
}: CorrespondenceWorkspaceProps) {
  const documentPanel = (
    <DocumentPreviewPanel correspondence={correspondence} {...documentPanelProps} />
  );

  return (
    <>
      {!hideMobileTabBar && (
        <CorrespondenceMobileTabBar
          minutesCount={minutesCount}
          mobileActiveTab={mobileActiveTab}
          onSetMobileActiveTab={onSetMobileActiveTab}
        />
      )}

      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
        <div className="w-[58%] min-w-0 flex flex-col border-r border-border bg-background">
          {documentPanel}
        </div>
        <div className="w-[42%] min-w-0 flex flex-col min-h-0">
          {routingPanelProps && <RoutingPanel {...routingPanelProps} />}
        </div>
      </div>

      {mobileActiveTab === 'document' && (
        <div className="md:hidden flex-1 min-h-0 flex flex-col overflow-hidden pb-20">
          {documentPanel}
        </div>
      )}
      {mobileActiveTab === 'routing' && routingPanelProps && (
        <div className="md:hidden flex-1 min-h-0 flex flex-col overflow-hidden pb-20">
          <RoutingPanel {...routingPanelProps} />
        </div>
      )}
    </>
  );
}
