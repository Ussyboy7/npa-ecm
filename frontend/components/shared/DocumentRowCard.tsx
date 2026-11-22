"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ListRowCard } from "@/components/shared/ListRowCard";
import { ChevronRight, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/correspondence-helpers";
import {
  correspondenceQueueBadgeClass,
  correspondenceQueueDateClass,
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  correspondenceQueueMetaIconClass,
  correspondenceQueueMetaItemClass,
  correspondenceQueueMetaRowClass,
  correspondenceQueueSubjectClass,
} from "@/components/shared/registry-queue-styles";
import type { DocumentRecord } from "@/lib/dms-types";

/** Leading tile / type chip colour by document type. */
const getTypeClass = (type: string) => {
  switch (type) {
    case "letter":
      return "border-blue-200 bg-blue-500/10 text-blue-600 dark:border-blue-800 dark:text-blue-400";
    case "memo":
      return "border-green-200 bg-green-500/10 text-green-600 dark:border-green-800 dark:text-green-400";
    case "circular":
      return "border-purple-200 bg-purple-500/10 text-purple-600 dark:border-purple-800 dark:text-purple-400";
    case "policy":
      return "border-orange-200 bg-orange-500/10 text-orange-600 dark:border-orange-800 dark:text-orange-400";
    case "report":
      return "border-pink-200 bg-pink-500/10 text-pink-600 dark:border-pink-800 dark:text-pink-400";
    case "form":
      return "border-cyan-200 bg-cyan-500/10 text-cyan-600 dark:border-cyan-800 dark:text-cyan-400";
    default:
      return "border-border bg-muted/50 text-muted-foreground";
  }
};

const getStatusClass = (status: string) => {
  switch (status) {
    case "published":
      return "text-success bg-success/10 border-success/20";
    case "draft":
      return "text-warning bg-warning/10 border-warning/20";
    case "archived":
      return "text-muted-foreground bg-muted border-border";
    default:
      return "text-foreground bg-muted border-border";
  }
};

const stripHtml = (value: string) =>
  value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

interface DocumentRowCardProps {
  doc: DocumentRecord;
  /** Shows Primary/Attach when a list groups several rows for the same record. */
  showRoleBadge?: boolean;
}

/** Shared document row: same title, chips, tile and meta line everywhere documents are listed. */
export const DocumentRowCard = ({ doc, showRoleBadge = false }: DocumentRowCardProps) => {
  const router = useRouter();
  const docType = doc.documentType || "other";
  const href = docType === "form" ? `/forms/${doc.id}` : `/dms/${doc.id}`;
  const description = doc.description ? stripHtml(doc.description) : "";

  return (
    <ListRowCard
      density="compact"
      href={href}
      leading={
        <div className={cn(correspondenceQueueLeadingBoxClass, getTypeClass(docType))}>
          <FileText className={correspondenceQueueLeadingIconClass} />
        </div>
      }
      actions={
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Open document"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(href);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Open document</TooltipContent>
        </Tooltip>
      }
    >
      <h4 className={correspondenceQueueSubjectClass}>{doc.title}</h4>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          <Badge
            variant="outline"
            className={cn(correspondenceQueueBadgeClass, "gap-0.5", getTypeClass(docType))}
          >
            <FileText className="h-2.5 w-2.5" />
            {docType}
          </Badge>
          <Badge
            variant="outline"
            className={cn(correspondenceQueueBadgeClass, getStatusClass(doc.status))}
          >
            {doc.status}
          </Badge>
          {doc.role && showRoleBadge ? (
            <Badge
              variant={doc.role === "primary" ? "default" : "secondary"}
              className={correspondenceQueueBadgeClass}
            >
              {doc.role === "primary" ? "Primary" : "Attach"}
            </Badge>
          ) : null}
        </div>
        <span className={correspondenceQueueDateClass}>
          {formatDateShort(doc.updatedAt || doc.createdAt)}
        </span>
      </div>
      {description ? (
        <p className="mt-1 line-clamp-1 text-[11px] leading-snug text-muted-foreground">
          {description}
        </p>
      ) : null}
      <div className={cn(correspondenceQueueMetaRowClass, "mt-1")}>
        {doc.referenceNumber ? (
          <span className={correspondenceQueueMetaItemClass}>
            <FileText className={correspondenceQueueMetaIconClass} />
            <span className="truncate">Ref: {doc.referenceNumber}</span>
          </span>
        ) : null}
        <span className={correspondenceQueueMetaItemClass}>
          <Clock className={correspondenceQueueMetaIconClass} />
          <span className="truncate">Created: {formatDateShort(doc.createdAt)}</span>
        </span>
      </div>
    </ListRowCard>
  );
};
