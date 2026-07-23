"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { ListRowCard } from "@/components/shared/ListRowCard";
import { FileText, Mail } from "lucide-react";
import { formatDateShort } from "@/lib/correspondence-helpers";
import { cn } from "@/lib/utils";
import {
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
} from "@/components/shared/registry-queue-styles";
import type { DocumentRecord } from "@/lib/dms-types";

type DocumentCardProps = {
  doc: DocumentRecord;
};

function DocumentCardContent({ doc }: DocumentCardProps) {
  const sharedDate = doc.permissions[0]?.createdAt || doc.updatedAt;

  return (
    <ListRowCard
      density="compact"
      href={`/dms/${doc.id}`}
      leading={(
        <div className={cn(correspondenceQueueLeadingBoxClass, "bg-blue-500/10")}>
          <FileText className={cn(correspondenceQueueLeadingIconClass, "text-blue-600 dark:text-blue-400")} />
        </div>
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">{doc.title}</h3>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <Badge variant="outline" className="h-5 rounded-md border px-1.5 py-0 text-[10px] font-semibold leading-none gap-1">
              <FileText className="h-3 w-3" />Document
            </Badge>
            <Badge variant="secondary" className="h-5 rounded-md border px-1.5 py-0 text-[10px] font-semibold leading-none">
              {doc.documentType}
            </Badge>
            <Badge variant={doc.status === "published" ? "default" : "outline"} className="h-5 rounded-md border px-1.5 py-0 text-[10px] font-semibold leading-none">
              {doc.status}
            </Badge>
          </div>
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{formatDateShort(sharedDate)}</span>
      </div>
      {doc.description && (
        <p className="text-xs text-muted-foreground line-clamp-1 mb-1">{doc.description}</p>
      )}
      <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] leading-tight text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <FileText className="h-3 w-3 shrink-0 opacity-80" />
          <span>Type: {doc.documentType}</span>
        </span>
        {doc.referenceNumber && (
          <span className="inline-flex items-center gap-1">
            <Mail className="h-3 w-3 shrink-0 opacity-80" />
            <span>Ref: {doc.referenceNumber}</span>
          </span>
        )}
      </div>
    </ListRowCard>
  );
}

export const DocumentCard = React.memo(DocumentCardContent);
