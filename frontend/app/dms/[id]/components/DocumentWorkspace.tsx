"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, PanelRight } from "lucide-react";
import type { ComponentProps } from "react";
import { DocumentPreviewPanel } from "./DocumentPreviewPanel";
import { DocumentSidebar } from "./DocumentSidebar";

type PreviewProps = ComponentProps<typeof DocumentPreviewPanel>;
type SidebarProps = ComponentProps<typeof DocumentSidebar>;

interface DmsDocumentWorkspaceProps {
  mobileActiveTab: "document" | "details";
  previewProps: PreviewProps;
  sidebarProps: SidebarProps;
}

export function DocumentMobileTabBar({
  mobileActiveTab,
  onSetMobileActiveTab,
  commentsCount,
}: {
  mobileActiveTab: "document" | "details";
  onSetMobileActiveTab: (tab: "document" | "details") => void;
  commentsCount: number;
}) {
  return (
    <div className="md:hidden border-b border-border bg-background px-2 py-1">
      <div className="flex gap-1">
        <Button
          variant={mobileActiveTab === "document" ? "default" : "ghost"}
          size="sm"
          className="flex-1 text-xs"
          onClick={() => onSetMobileActiveTab("document")}
        >
          <FileText className="h-3.5 w-3.5 mr-1" />
          Document
        </Button>
        <Button
          variant={mobileActiveTab === "details" ? "default" : "ghost"}
          size="sm"
          className="flex-1 text-xs"
          onClick={() => onSetMobileActiveTab("details")}
        >
          <PanelRight className="h-3.5 w-3.5 mr-1" />
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

export function DmsDocumentWorkspace({
  mobileActiveTab,
  previewProps,
  sidebarProps,
}: DmsDocumentWorkspaceProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
        <div className="w-[58%] min-w-0 flex flex-col min-h-0 border-r border-border">
          <DocumentPreviewPanel {...previewProps} />
        </div>
        <div className="w-[42%] min-w-0 flex flex-col min-h-0 overflow-hidden">
          <DocumentSidebar {...sidebarProps} />
        </div>
      </div>

      {mobileActiveTab === "document" && (
        <div className="md:hidden flex-1 min-h-0 flex flex-col overflow-hidden pb-16">
          <DocumentPreviewPanel {...previewProps} />
        </div>
      )}
      {mobileActiveTab === "details" && (
        <div className="md:hidden flex-1 min-h-0 flex flex-col overflow-hidden pb-16">
          <DocumentSidebar {...sidebarProps} />
        </div>
      )}
    </div>
  );
}
