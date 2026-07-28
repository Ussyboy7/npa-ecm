"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Building2, Clock, FileText, Link2, Lock, User } from "lucide-react";
import type { DocumentRecord } from "@/lib/api/dms";
import {
  DetailStatusStrip,
  StatusStripSep,
} from "@/components/shared/DetailStatusStrip";
import { getDocumentStatusBadge } from "@/lib/status-badge";
import { formatDate } from "@/lib/datetime";

interface DocumentStatusStripProps {
  document: DocumentRecord;
  authorName?: string;
  versionCount?: number;
  linkedCorrespondenceCount?: number;
  divisionName?: string;
  departmentName?: string;
  className?: string;
}

function formatUpdated(dateStr: string): string {
  return formatDate(dateStr, "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const DocumentStatusStripContent = ({
  document,
  authorName,
  versionCount = 0,
  linkedCorrespondenceCount = 0,
  divisionName,
  departmentName,
  className,
}: DocumentStatusStripProps) => {
  const orgLine = [divisionName, departmentName].filter(Boolean).join(" / ");
  const statusBadge = getDocumentStatusBadge(document.status);

  return (
    <DetailStatusStrip className={className}>
      <Badge
        variant={statusBadge.variant}
        className="text-[10px] h-5 shrink-0"
      >
        {statusBadge.label}
      </Badge>

      <StatusStripSep />
      <Badge variant="outline" className="text-[10px] h-5 capitalize shrink-0">
        {document.documentType}
      </Badge>

      <StatusStripSep />
      <Badge
        variant={document.sensitivity === "restricted" ? "destructive" : "outline"}
        className="text-[10px] h-5 capitalize shrink-0"
      >
        {document.sensitivity === "restricted" ? (
          <span className="inline-flex items-center gap-1">
            <Lock className="h-2.5 w-2.5" />
            {document.sensitivity}
          </span>
        ) : (
          document.sensitivity
        )}
      </Badge>

      {authorName ? (
        <>
          <StatusStripSep />
          <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
            <User className="h-3 w-3" />
            {authorName}
          </span>
        </>
      ) : null}

      <StatusStripSep />
      <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
        <Clock className="h-3 w-3" />
        {formatUpdated(document.updatedAt)}
      </span>

      {versionCount > 0 ? (
        <>
          <StatusStripSep />
          <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
            <FileText className="h-3 w-3" />
            {versionCount} {versionCount === 1 ? "version" : "versions"}
          </span>
        </>
      ) : null}

      {linkedCorrespondenceCount > 0 ? (
        <>
          <StatusStripSep />
          <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
            <Link2 className="h-3 w-3" />
            {linkedCorrespondenceCount} linked
          </span>
        </>
      ) : null}

      {orgLine ? (
        <>
          <StatusStripSep />
          <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
            <Building2 className="h-3 w-3" />
            {orgLine}
          </span>
        </>
      ) : null}
    </DetailStatusStrip>
  );
};

export const DocumentStatusStrip = React.memo(DocumentStatusStripContent);
DocumentStatusStrip.displayName = "DocumentStatusStrip";
