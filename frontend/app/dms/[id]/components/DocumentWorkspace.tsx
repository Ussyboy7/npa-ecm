"use client";

import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Info, PanelRightOpen } from "lucide-react";
import type { ComponentProps } from "react";
import { DocumentPreviewPanel } from "./DocumentPreviewPanel";
import { DocumentSidebar } from "./DocumentSidebar";
import { cn } from "@/lib/utils";

type DocumentPreviewPanelProps = ComponentProps<typeof DocumentPreviewPanel>;
type DocumentSidebarProps = ComponentProps<typeof DocumentSidebar>;

interface DocumentWorkspaceProps {
  mobileActiveTab: "document" | "details";
  documentFocus: boolean;
  onSetDocumentFocus: (focus: boolean) => void;
  previewProps: DocumentPreviewPanelProps;
  sidebarProps: DocumentSidebarProps;
}

export function DocumentMobileTabBar({
  commentsCount,
  mobileActiveTab,
  onSetMobileActiveTab,
}: {
  commentsCount: number;
  mobileActiveTab: "document" | "details";
  onSetMobileActiveTab: (tab: "document" | "details") => void;
}) {
  return (
    <div className="md:hidden border-b border-border/50 bg-background/90 backdrop-blur-sm px-2 py-1.5">
      <div className="flex gap-1 rounded-full bg-muted/50 p-1">
        <Button
          variant={mobileActiveTab === "document" ? "default" : "ghost"}
          size="sm"
          className="flex-1 text-xs rounded-full transition-colors motion-reduce:transition-none"
          onClick={() => onSetMobileActiveTab("document")}
        >
          <FileText className="h-3.5 w-3.5 mr-1" />
          Document
        </Button>
        <Button
          variant={mobileActiveTab === "details" ? "default" : "ghost"}
          size="sm"
          className="flex-1 text-xs rounded-full transition-colors motion-reduce:transition-none"
          onClick={() => onSetMobileActiveTab("details")}
        >
          <Info className="h-3.5 w-3.5 mr-1" />
          Details
          {commentsCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
              {commentsCount}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
}

export function DocumentWorkspace({
  mobileActiveTab,
  documentFocus,
  onSetDocumentFocus,
  previewProps,
  sidebarProps,
}: DocumentWorkspaceProps) {
  const preview = (
    <DocumentPreviewPanel
      {...previewProps}
      documentFocus={documentFocus}
      onToggleDocumentFocus={() => onSetDocumentFocus(!documentFocus)}
    />
  );

  return (
    <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
        {documentFocus ? (
          <div className="w-full min-w-0 flex flex-col bg-background">{preview}</div>
        ) : (
          <PanelGroup
            direction="horizontal"
            className="flex-1 min-h-0"
            autoSaveId="npa-ecm-dms-detail-panels"
          >
            <Panel
              id="preview"
              order={1}
              defaultSize={68}
              minSize={45}
              maxSize={80}
              className="min-w-0"
            >
              <div className="h-full min-h-0 flex flex-col border-r border-border/50 bg-background">
                {preview}
              </div>
            </Panel>

            <PanelResizeHandle
              className={cn(
                "group relative w-1.5 flex-shrink-0 bg-transparent",
                "hover:bg-primary/15 active:bg-primary/25",
                "transition-colors motion-reduce:transition-none",
                "outline-none focus-visible:bg-primary/20",
              )}
              aria-label="Resize document and details panels"
            >
              <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/70 group-hover:bg-primary/40 group-active:bg-primary/60" />
            </PanelResizeHandle>

            <Panel
              id="details"
              order={2}
              defaultSize={32}
              minSize={20}
              maxSize={55}
              className="min-w-0"
            >
              <div className="h-full min-h-0 flex flex-col bg-muted/15 overflow-hidden">
                <DocumentSidebar {...sidebarProps} />
              </div>
            </Panel>
          </PanelGroup>
        )}

        {documentFocus && (
          <div className="absolute right-4 top-20 z-20 animate-in fade-in slide-in-from-right-2 duration-200 motion-reduce:animate-none">
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full shadow-md gap-1.5 h-8 text-xs"
              onClick={() => onSetDocumentFocus(false)}
              title="Show details panel"
            >
              <PanelRightOpen className="h-3.5 w-3.5" />
              Details
            </Button>
          </div>
        )}
      </div>

      {mobileActiveTab === "document" && (
        <div className="md:hidden flex-1 min-h-0 flex flex-col overflow-hidden pb-16 animate-in fade-in duration-200 motion-reduce:animate-none">
          {preview}
        </div>
      )}
      {mobileActiveTab === "details" && (
        <div className="md:hidden flex-1 min-h-0 flex flex-col overflow-hidden pb-16 animate-in fade-in duration-200 motion-reduce:animate-none">
          <DocumentSidebar {...sidebarProps} />
        </div>
      )}
    </div>
  );
}
