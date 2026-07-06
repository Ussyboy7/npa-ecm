"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DocumentVersionDiff } from "@/lib/dms-version-diff";

interface DocumentVersionDiffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diff: DocumentVersionDiff | null;
  loading?: boolean;
}

export function DocumentVersionDiffDialog({
  open,
  onOpenChange,
  diff,
  loading = false,
}: DocumentVersionDiffDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Version comparison</DialogTitle>
          <DialogDescription>
            {diff
              ? `Changes from v${diff.leftVersionNumber} to v${diff.rightVersionNumber}`
              : "Loading diff…"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Computing diff…</div>
        ) : diff ? (
          <div className="space-y-3 min-h-0 flex-1 flex flex-col">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">v{diff.leftVersionNumber} → v{diff.rightVersionNumber}</Badge>
              {diff.hasContent ? (
                <>
                  <Badge variant="secondary">+{diff.addedLines} lines</Badge>
                  <Badge variant="secondary">−{diff.removedLines} lines</Badge>
                </>
              ) : (
                <Badge variant="secondary">No text content</Badge>
              )}
            </div>
            <ScrollArea className="flex-1 rounded-md border bg-muted/30 p-3 max-h-[55vh]">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                {diff.hasContent && diff.unifiedDiff
                  ? diff.unifiedDiff
                  : diff.summary || "No extractable text in either version."}
              </pre>
            </ScrollArea>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
