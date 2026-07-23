"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sanitizeRichText } from "@/lib/sanitize-html";
import type { DocumentRecord } from "@/lib/dms-storage";

interface DocumentMetadataCardProps {
  document: DocumentRecord;
}

/** Sidebar metadata only — title, org, status, etc. live in the page header. */
export function DocumentMetadataCard({ document }: DocumentMetadataCardProps) {
  const hasDescription = Boolean(document.description?.trim());
  const hasTags = Boolean(document.tags && document.tags.length > 0);

  if (!hasDescription && !hasTags) {
    return null;
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold">About this document</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
  {hasDescription && (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Description</p>
      <div
        className="prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizeRichText(document.description!) }}
      />
    </div>
  )}
        {hasTags && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Tags</p>
            <div className="flex flex-wrap gap-1">
              {document.tags!.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
