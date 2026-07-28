"use client";

import { Badge } from "@/components/ui/badge";
import { sanitizeThemedHtml } from "@/lib/sanitize-html";
import type { DocumentRecord } from "@/lib/api/dms";

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
    <div className="rounded-xl bg-muted/30 px-3 py-2.5 space-y-2.5 min-w-0">
      <p className="text-[13px] font-semibold tracking-tight">About</p>
      {hasDescription && (
        <div className="min-w-0 overflow-hidden">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
            Description
          </p>
          <div
            className="prose prose-sm max-w-none text-[13px] leading-snug text-neutral-900 dark:text-neutral-100 [&_*]:!text-inherit [&_a]:!text-blue-700 dark:[&_a]:!text-blue-400 rounded-lg bg-background/80 p-2.5 overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: sanitizeThemedHtml(document.description!) }}
          />
        </div>
      )}
      {hasTags && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Tags</p>
          <div className="flex flex-wrap gap-1">
            {document.tags!.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] max-w-full truncate">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
