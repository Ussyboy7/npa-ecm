"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentVersion } from "@/lib/api/dms";

interface DocumentVersionStripProps {
  versions: DocumentVersion[];
  selectedVersionId: string | null;
  onSelectVersion: (version: DocumentVersion) => void;
  /** Opens full version management (upload / OCR / replace). */
  onManageVersions?: () => void;
}

/** Quiet version switcher under preview — manage lives in Preview → Versions. */
export function DocumentVersionStrip({
  versions,
  selectedVersionId,
  onSelectVersion,
  onManageVersions,
}: DocumentVersionStripProps) {
  if (versions.length <= 1 && !onManageVersions) {
    return null;
  }

  return (
    <div className="border border-border/50 border-t-0 rounded-b-2xl bg-muted/20 shrink-0">
      <div className="flex items-center gap-2 px-2.5 py-1.5 min-w-0">
        {versions.length > 1 ? (
          <ScrollArea className="flex-1 min-w-0">
            <div className="flex items-center gap-1 pr-2">
              {versions.map((version, index) => {
                const isLatest = index === 0;
                const isSelected = version.id === selectedVersionId;
                return (
                  <button
                    key={version.id}
                    type="button"
                    onClick={() => onSelectVersion(version)}
                    title={version.fileName || `Version ${version.versionNumber}`}
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-background/80 text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                  >
                    v{version.versionNumber}
                    {isLatest ? (
                      <span className="ml-1 opacity-70 font-normal">latest</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        ) : (
          <span className="flex-1 text-[11px] text-muted-foreground px-1">v1</span>
        )}
        {onManageVersions ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 rounded-full px-2.5 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
            onClick={onManageVersions}
          >
            <FolderOpen className="h-3 w-3" />
            Manage
          </Button>
        ) : null}
      </div>
    </div>
  );
}
