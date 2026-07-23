"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Building2, Calendar, Clock, User } from "lucide-react";
import {
  DetailStatusStrip,
  StatusStripSep,
} from "@/components/shared/DetailStatusStrip";
import { getCaseStatusBadge, getPriorityBadgeVariant } from "@/lib/status-badge";
import { formatDateShort } from "@/lib/correspondence-helpers";
import type { CaseDetail } from "@/lib/npa-structure";

interface CaseStatusStripProps {
  caseData: CaseDetail;
  slaStatus?: {
    status: "ok" | "warning" | "critical" | "breach";
    target_date: string;
  } | null;
  slaError?: string | null;
  owningOfficeName?: string | null;
  assignedToName?: string | null;
  className?: string;
}

const CaseStatusStripContent = ({
  caseData,
  slaStatus,
  slaError,
  owningOfficeName,
  assignedToName,
  className,
}: CaseStatusStripProps) => {
  const statusKey = caseData.status.replace(/_/g, "-");
  const statusBadge = getCaseStatusBadge(statusKey);
  const caseType = caseData.caseType?.replace(/_/g, " ") ?? "general";

  return (
    <DetailStatusStrip className={className}>
      <Badge
        variant={statusBadge.variant}
        className={`text-[10px] h-5 shrink-0 ${statusBadge.className ?? ""}`}
      >
        {statusBadge.label}
      </Badge>

      <StatusStripSep />
      <Badge
        variant={getPriorityBadgeVariant(caseData.priority)}
        className="text-[10px] h-5 capitalize shrink-0"
      >
        {caseData.priority}
      </Badge>

      <StatusStripSep />
      <Badge variant="outline" className="text-[10px] h-5 capitalize shrink-0">
        {caseType}
      </Badge>

      {slaStatus && !slaError ? (
        <>
          <StatusStripSep />
          <Badge
            variant={
              slaStatus.status === "breach" || slaStatus.status === "critical"
                ? "destructive"
                : slaStatus.status === "warning"
                  ? "default"
                  : "secondary"
            }
            className="text-[10px] h-5 shrink-0 gap-1"
          >
            <AlertTriangle className="h-2.5 w-2.5" />
            SLA {slaStatus.status}
          </Badge>
        </>
      ) : null}

      <StatusStripSep />
      <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
        <Calendar className="h-3 w-3" />
        Opened {formatDateShort(caseData.openedAt)}
      </span>

      {slaStatus?.target_date ? (
        <>
          <StatusStripSep />
          <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
            <Clock className="h-3 w-3" />
            Target {formatDateShort(slaStatus.target_date)}
          </span>
        </>
      ) : null}

      {assignedToName ? (
        <>
          <StatusStripSep />
          <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
            <User className="h-3 w-3" />
            {assignedToName}
          </span>
        </>
      ) : null}

      {owningOfficeName ? (
        <>
          <StatusStripSep />
          <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
            <Building2 className="h-3 w-3" />
            {owningOfficeName}
          </span>
        </>
      ) : null}
    </DetailStatusStrip>
  );
};

export const CaseStatusStrip = React.memo(CaseStatusStripContent);
CaseStatusStrip.displayName = "CaseStatusStrip";
