"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { formatFileSize } from "@/lib/file-utils";
import type { DocumentVersion } from "@/lib/dms-storage";

interface DocumentVersionStripProps {
  versions: DocumentVersion[];
  selectedVersionId: string | null;
  onSelectVersion: (version: DocumentVersion) => void;
}

/** Version picker — only shown when there are 2+ versions. */
export function DocumentVersionStrip({
  versions,
  selectedVersionId,
  onSelectVersion,
}: DocumentVersionStripProps) {
  if (versions.length <= 1) {
    return null;
  }

  return (
    <div className="border border-border border-t-0 rounded-b-lg bg-muted/30 shrink-0">
      <ScrollArea className="w-full">
        <div className="flex items-center gap-2 px-3 py-2">
          {versions.map((version, index) => {
            const isLatest = index === 0;
            const isSelected = version.id === selectedVersionId;
            return (
              <button
                key={version.id}
                type="button"
                onClick={() => onSelectVersion(version)}
                className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-left text-xs transition-colors shrink-0 max-w-[200px] ${
                  isSelected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <Badge variant={isLatest ? "default" : "outline"} className="text-[10px] px-1.5 py-0">
                  v{version.versionNumber}
                </Badge>
                <span className="truncate font-medium" title={version.fileName}>
                  {version.fileName || `Version ${version.versionNumber}`}
                </span>
                {version.fileSize ? (
                  <span className="text-[10px] opacity-70 hidden sm:inline">
                    {formatFileSize(version.fileSize)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
