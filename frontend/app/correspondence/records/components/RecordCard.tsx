"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ListRowCard } from "@/components/shared/ListRowCard";
import {
  FileArchive,
  ChevronRight,
  MoreVertical,
  Eye,
  ExternalLink,
  Copy,
  Download,
  CheckCircle2,
  User as UserIcon,
  FileText,
  Building2,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { formatDateShort } from "@/lib/correspondence-helpers";
import { cn } from "@/lib/utils";
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
import { useOrganization } from "@/contexts/OrganizationContext";
import type { Correspondence } from "@/lib/npa-structure";
import { toast } from "@/components/ui/sonner";

function getPriorityBadgeVariant(priority: string): "destructive" | "default" | "secondary" | "outline" {
  switch (priority) {
    case "urgent": return "destructive";
    case "high": return "default";
    case "medium": return "secondary";
    case "low": return "outline";
    default: return "secondary";
  }
}

type RecordCardProps = {
  corr: Correspondence;
};

function RecordCardContent({ corr }: RecordCardProps) {
  const router = useRouter();
  const { divisions, departments, directorates } = useOrganization();

  const division = useMemo(
    () => corr.divisionId ? divisions.find((item) => item.id === corr.divisionId) : null,
    [corr.divisionId, divisions],
  );
  const department = useMemo(
    () => corr.departmentId ? departments.find((item) => item.id === corr.departmentId) : null,
    [corr.departmentId, departments],
  );
  const directorate = useMemo(
    () => corr.directorateId ? directorates.find((item) => item.id === corr.directorateId) : null,
    [corr.directorateId, directorates],
  );

  const archiveLevel = corr.archiveLevel || "department";
  const levelLabel = archiveLevel === "directorate" ? "Directorate" : archiveLevel === "division" ? "Division" : "Department";
  const orgParts: string[] = [];
  if (directorate?.name) orgParts.push(directorate.name);
  if (division?.name) orgParts.push(division.name);
  if (department?.name) orgParts.push(department.name);
  const orgPath = orgParts.join(" → ");

  return (
    <ListRowCard
      density="compact"
      href={`/correspondence/${corr.id}`}
      leading={(
        <div className={cn(correspondenceQueueLeadingBoxClass, "bg-muted")}>
          <FileArchive className={cn(correspondenceQueueLeadingIconClass, "text-muted-foreground")} />
        </div>
      )}
      actions={(
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="Open record"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/correspondence/${corr.id}`);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Open record</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="More actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/correspondence/${corr.id}`} className="flex items-center">
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  window.open(`/correspondence/${corr.id}`, "_blank");
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in New Tab
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  void navigator.clipboard.writeText(corr.referenceNumber || "");
                  toast.success("Reference number copied to clipboard");
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Reference
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  void navigator.clipboard.writeText(`${window.location.origin}/correspondence/${corr.id}`);
                  toast.success("Link copied to clipboard");
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </DropdownMenuItem>
              {corr.completionPackage?.fileUrl ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      window.open(corr.completionPackage?.fileUrl, "_blank");
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Completion Package
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    >
      <h4 className={correspondenceQueueSubjectClass}>{corr.subject}</h4>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          <Badge variant={getPriorityBadgeVariant(corr.priority)} className={correspondenceQueueBadgeClass}>
            {corr.priority.toUpperCase()}
          </Badge>
          <Badge variant="outline" className={cn(correspondenceQueueBadgeClass, "gap-0.5")}>
            {corr.direction === "downward" ? (
              <><ArrowDown className="h-2.5 w-2.5 text-info" />Downward</>
            ) : (
              <><ArrowUp className="h-2.5 w-2.5 text-success" />Upward</>
            )}
          </Badge>
          <Badge variant="secondary" className={cn(correspondenceQueueBadgeClass, "gap-0.5 text-success bg-success/10")}>
            <CheckCircle2 className="h-2.5 w-2.5" />
            {corr.status === "archived" ? "Archived" : "Completed"}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              correspondenceQueueBadgeClass,
              archiveLevel === "directorate"
                ? "bg-primary/10 text-primary"
                : archiveLevel === "division"
                  ? "bg-info/10 text-info"
                  : "",
            )}
          >
            {levelLabel} Record
          </Badge>
        </div>
        <span className={correspondenceQueueDateClass}>
          {formatDateShort(corr.completedAt || corr.receivedDate)}
        </span>
      </div>
      <div className={cn(correspondenceQueueMetaRowClass, "mt-1")}>
        <span className={correspondenceQueueMetaItemClass}>
          <UserIcon className={correspondenceQueueMetaIconClass} />
          <span className="truncate">From: {corr.senderName || "Unknown"}</span>
        </span>
        <span className={correspondenceQueueMetaItemClass}>
          <FileText className={correspondenceQueueMetaIconClass} />
          <span className="truncate">Ref: {corr.referenceNumber || "N/A"}</span>
        </span>
        {orgPath ? (
          <span className={correspondenceQueueMetaItemClass}>
            <Building2 className={correspondenceQueueMetaIconClass} />
            <span className="truncate">{orgPath}</span>
          </span>
        ) : null}
      </div>
    </ListRowCard>
  );
}

export const RecordCard = React.memo(RecordCardContent);
